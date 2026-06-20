const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TELEMETRY_SCHEMA_VERSION = "0.1.0";
const STORE_RELATIVE_PATH = path.join("data", "runtime", "appliance-telemetry.json");
const FLEXIBLE_DEVICE_TYPES = new Set([
  "ev",
  "wallbox",
  "dishwasher",
  "washing_machine",
  "dryer",
  "heat_pump"
]);

function round(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function storePath(rootDir) {
  return path.join(rootDir, STORE_RELATIVE_PATH);
}

function emptyStore() {
  return {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    readings: []
  };
}

function ensureStoreDir(rootDir) {
  fs.mkdirSync(path.dirname(storePath(rootDir)), { recursive: true });
}

function readTelemetryStore(rootDir) {
  const filePath = storePath(rootDir);
  if (!fs.existsSync(filePath)) return emptyStore();
  const store = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    schema_version: store.schema_version || TELEMETRY_SCHEMA_VERSION,
    readings: Array.isArray(store.readings) ? store.readings : []
  };
}

function writeTelemetryStore(rootDir, store) {
  ensureStoreDir(rootDir);
  fs.writeFileSync(
    storePath(rootDir),
    `${JSON.stringify({
      schema_version: TELEMETRY_SCHEMA_VERSION,
      readings: Array.isArray(store.readings) ? store.readings : []
    }, null, 2)}\n`
  );
}

function dateKeyFromTimestamp(timestamp) {
  const value = String(timestamp || "");
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return new Date(timestamp || Date.now()).toISOString().slice(0, 10);
}

function intervalHours(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return (endMs - startMs) / (60 * 60 * 1000);
}

function normalizeDeviceType(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function inferDeviceType(deviceId) {
  const normalized = normalizeDeviceType(deviceId);
  if (normalized.includes("dish")) return "dishwasher";
  if (normalized.includes("heat")) return "heat_pump";
  if (normalized.includes("wallbox")) return "wallbox";
  if (normalized.includes("battery")) return "battery";
  if (normalized.includes("ev")) return "ev";
  return "unknown";
}

function makeReadingId(reading) {
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify([
      reading.household_id,
      reading.device_id,
      reading.interval_start,
      reading.interval_end,
      reading.energy_kwh,
      reading.source.name
    ]))
    .digest("hex")
    .slice(0, 14);
  return `tel_${hash}`;
}

function normalizeReading(input, fixtures, nowIso = new Date().toISOString()) {
  const householdId = String(
    input.household_id ||
    fixtures.household?.household_id ||
    fixtures.deviceState?.household_id ||
    "unknown_household"
  );
  const deviceId = String(input.device_id || "").trim();
  if (!deviceId) {
    throw Object.assign(new Error("device_id is required for appliance telemetry."), { statusCode: 400 });
  }

  const intervalStart = input.interval_start || input.observed_at || nowIso;
  const intervalEnd = input.interval_end || input.observed_at || intervalStart;
  const deviceType = normalizeDeviceType(input.device_type || input.appliance_category || inferDeviceType(deviceId));
  const powerKw = input.power_kw !== undefined
    ? positiveNumber(input.power_kw)
    : input.power_w !== undefined ? positiveNumber(input.power_w) / 1000 : null;
  const energyKwh = input.energy_kwh !== undefined
    ? positiveNumber(input.energy_kwh)
    : powerKw !== null ? powerKw * intervalHours(intervalStart, intervalEnd) : null;

  if (energyKwh === null) {
    throw Object.assign(new Error("energy_kwh or power_kw/power_w with an interval is required."), { statusCode: 400 });
  }

  const reading = {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    household_id: householdId,
    device_id: deviceId,
    device_type: deviceType,
    interval_start: intervalStart,
    interval_end: intervalEnd,
    observed_at: input.observed_at || intervalEnd,
    energy_kwh: round(energyKwh),
    power_kw: powerKw === null ? null : round(powerKw),
    flexible_load: input.flexible_load === undefined
      ? FLEXIBLE_DEVICE_TYPES.has(deviceType)
      : Boolean(input.flexible_load),
    source: {
      name: input.source?.name || input.provider || "Appliance telemetry ingest API",
      adapter: input.source?.adapter || input.adapter || "prototype_ingest",
      status: input.source?.status || "actual",
      confidence: round(positiveNumber(input.source?.confidence ?? input.confidence, 0.86), 2)
    }
  };
  reading.reading_id = input.reading_id || makeReadingId(reading);
  return reading;
}

function filterTodayReadings(store, householdId, date) {
  return store.readings.filter((reading) => (
    reading.household_id === householdId &&
    dateKeyFromTimestamp(reading.interval_start || reading.observed_at) === date
  ));
}

function summarizeApplianceReadings(readings, options) {
  const byDevice = new Map();
  readings.forEach((reading) => {
    const current = byDevice.get(reading.device_id) || {
      device_id: reading.device_id,
      device_type: reading.device_type,
      total_energy_kwh: 0,
      max_power_kw: 0,
      interval_count: 0,
      flexible_load: Boolean(reading.flexible_load),
      first_interval_start: reading.interval_start,
      last_observed_at: reading.observed_at,
      source_status: reading.source?.status || "actual",
      confidence: reading.source?.confidence || 0.86
    };
    current.total_energy_kwh += positiveNumber(reading.energy_kwh);
    current.max_power_kw = Math.max(current.max_power_kw, positiveNumber(reading.power_kw));
    current.interval_count += 1;
    current.flexible_load = current.flexible_load || Boolean(reading.flexible_load);
    if (new Date(reading.interval_start) < new Date(current.first_interval_start)) {
      current.first_interval_start = reading.interval_start;
    }
    if (new Date(reading.observed_at) > new Date(current.last_observed_at)) {
      current.last_observed_at = reading.observed_at;
    }
    current.confidence = Math.max(current.confidence, reading.source?.confidence || 0.86);
    byDevice.set(reading.device_id, current);
  });

  const devices = Array.from(byDevice.values()).map((device) => ({
    ...device,
    total_energy_kwh: round(device.total_energy_kwh),
    max_power_kw: round(device.max_power_kw),
    confidence: round(device.confidence, 2)
  })).sort((a, b) => b.total_energy_kwh - a.total_energy_kwh);
  const totalActualKwh = round(devices.reduce((sum, device) => sum + device.total_energy_kwh, 0));
  const flexibleActualKwh = round(devices.reduce((sum, device) => (
    sum + (device.flexible_load ? device.total_energy_kwh : 0)
  ), 0));
  const lastObservedAt = readings.reduce((latest, reading) => {
    if (!latest || new Date(reading.observed_at) > new Date(latest)) return reading.observed_at;
    return latest;
  }, null);

  return {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    household_id: options.household_id,
    date: options.date,
    timezone: options.timezone,
    storage: {
      mode: "prototype_json_store",
      path: STORE_RELATIVE_PATH,
      production_target: "PostgreSQL + TimescaleDB hypertable"
    },
    status: devices.length ? "actual_readings_available" : "no_appliance_readings_today",
    device_count: devices.length,
    total_actual_kwh: totalActualKwh,
    flexible_actual_kwh: flexibleActualKwh,
    baseline_actual_kwh: round(totalActualKwh - flexibleActualKwh),
    last_observed_at: lastObservedAt,
    by_device: devices,
    source_quality: [{
      field: "appliance_telemetry_today",
      source: STORE_RELATIVE_PATH,
      status: devices.length ? "actual" : "not_connected",
      unit: "kWh",
      value: totalActualKwh,
      confidence: devices.length ? round(Math.max(...devices.map((device) => device.confidence)), 2) : 0
    }]
  };
}

function buildTelemetryOptimizerInputs(summary) {
  const actualDeviceEnergy = {};
  summary.by_device.forEach((device) => {
    actualDeviceEnergy[device.device_id] = device.total_energy_kwh;
  });

  return {
    input_snapshot_id: [
      summary.household_id,
      summary.date,
      summary.last_observed_at || "no-live-appliance-readings"
    ].join(":"),
    actual_device_energy_kwh: actualDeviceEnergy,
    flexible_load_actual_kwh: summary.flexible_actual_kwh,
    baseline_load_actual_kwh: summary.baseline_actual_kwh,
    top_device_today: summary.by_device[0] || null,
    optimizer_use: [
      "Replace product-label estimates with actual interval kWh when available.",
      "Rank flexible appliances by observed kWh, deadline, comfort impact, and tariff spread.",
      "Keep read-only telemetry separate from device control commands."
    ]
  };
}

function getTodayApplianceTelemetry(rootDir, fixtures, options = {}) {
  const store = readTelemetryStore(rootDir);
  const householdId = String(options.household_id || fixtures.household?.household_id || "unknown_household");
  const date = options.date || dateKeyFromTimestamp(
    options.observed_at || fixtures.deviceState?.observed_at || new Date().toISOString()
  );
  const timezone = fixtures.household?.timezone || fixtures.deviceState?.timezone || "Europe/Berlin";
  const readings = filterTodayReadings(store, householdId, date);
  const summary = summarizeApplianceReadings(readings, {
    household_id: householdId,
    date,
    timezone
  });

  return {
    ...summary,
    optimizer_inputs: buildTelemetryOptimizerInputs(summary)
  };
}

function ingestApplianceTelemetry(rootDir, fixtures, payload = {}) {
  const inputs = Array.isArray(payload.readings) ? payload.readings : [payload];
  if (!inputs.length) {
    throw Object.assign(new Error("At least one telemetry reading is required."), { statusCode: 400 });
  }

  const store = readTelemetryStore(rootDir);
  const normalized = inputs.map((item) => normalizeReading(item, fixtures));
  const existingById = new Map(store.readings.map((reading) => [reading.reading_id, reading]));
  let insertedCount = 0;

  normalized.forEach((reading) => {
    if (!existingById.has(reading.reading_id)) insertedCount += 1;
    existingById.set(reading.reading_id, reading);
  });

  const readings = Array.from(existingById.values()).sort((a, b) => {
    const timeDiff = new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.device_id.localeCompare(b.device_id);
  });
  writeTelemetryStore(rootDir, { readings });

  return {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    inserted_count: insertedCount,
    upserted_count: normalized.length,
    stored_count: readings.length,
    readings: normalized,
    today: getTodayApplianceTelemetry(rootDir, fixtures, {
      household_id: normalized[0].household_id,
      date: dateKeyFromTimestamp(normalized[0].interval_start)
    })
  };
}

module.exports = {
  TELEMETRY_SCHEMA_VERSION,
  STORE_RELATIVE_PATH,
  buildTelemetryOptimizerInputs,
  getTodayApplianceTelemetry,
  ingestApplianceTelemetry,
  normalizeReading,
  readTelemetryStore
};
