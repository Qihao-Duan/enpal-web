const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HOME_DEVICE_SCHEMA_VERSION = "0.1.0";
const STORE_RELATIVE_PATH = path.join("data", "runtime", "home-devices.json");
const FLEXIBLE_CATEGORIES = new Set([
  "ev",
  "wallbox",
  "dishwasher",
  "washing_machine",
  "dryer",
  "heat_pump"
]);

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCategory(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function titleCase(value) {
  return String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactNumber(value, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

function storePath(rootDir) {
  return path.join(rootDir, STORE_RELATIVE_PATH);
}

function ensureStoreDir(rootDir) {
  fs.mkdirSync(path.dirname(storePath(rootDir)), { recursive: true });
}

function emptyStore() {
  return {
    schema_version: HOME_DEVICE_SCHEMA_VERSION,
    devices: []
  };
}

function readDeviceStore(rootDir) {
  const filePath = storePath(rootDir);
  if (!fs.existsSync(filePath)) return emptyStore();
  const store = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    schema_version: store.schema_version || HOME_DEVICE_SCHEMA_VERSION,
    devices: Array.isArray(store.devices) ? store.devices : []
  };
}

function writeDeviceStore(rootDir, store) {
  ensureStoreDir(rootDir);
  fs.writeFileSync(
    storePath(rootDir),
    `${JSON.stringify({
      schema_version: HOME_DEVICE_SCHEMA_VERSION,
      devices: Array.isArray(store.devices) ? store.devices : []
    }, null, 2)}\n`
  );
}

function makeDeviceId(input) {
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify([
      input.category,
      input.name,
      input.model,
      input.energy_profile?.cycle_kwh,
      input.energy_profile?.power_kw
    ]))
    .digest("hex")
    .slice(0, 12);
  return `home_${normalizeCategory(input.category)}_${hash}`;
}

function currentPrice(fixtures) {
  return Number(fixtures.contract?.price_rules?.current_import_price_eur_per_kwh || 0);
}

function cheapestWindow(fixtures) {
  const hours = Array.isArray(fixtures.forecast?.hours) ? fixtures.forecast.hours : [];
  const best = hours.reduce((current, hour) => {
    if (!current) return hour;
    return Number(hour.grid_import_price_eur_per_kwh) < Number(current.grid_import_price_eur_per_kwh)
      ? hour
      : current;
  }, null);
  const index = best ? hours.indexOf(best) : -1;
  return {
    interval_start: best?.hour_start || fixtures.forecast?.horizon?.start || null,
    interval_end: index >= 0
      ? hours[index + 1]?.hour_start || fixtures.forecast?.horizon?.end || null
      : fixtures.forecast?.horizon?.end || null,
    price_eur_per_kwh: Number(
      best?.grid_import_price_eur_per_kwh ||
      fixtures.forecast?.summary?.lowest_import_price_eur_per_kwh ||
      currentPrice(fixtures)
    )
  };
}

function timeLabel(timestamp) {
  const match = String(timestamp || "").match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "best window";
}

function buildDeviceAdvice(fixtures, device) {
  const cycleKwh = numberOrNull(device.energy_profile?.cycle_kwh);
  const powerKw = numberOrNull(device.energy_profile?.power_kw);
  const runtimeMinutes = numberOrNull(device.energy_profile?.runtime_minutes);
  const window = cheapestWindow(fixtures);
  const flexible = Boolean(device.flexible_load);

  if (cycleKwh === null) {
    return {
      status: "needs_energy_confirmation",
      recommendation: "Add kWh per cycle, rated power, or a meter reading before this device affects the schedule.",
      formula: "needs cycle_kwh or power_kw x runtime_hours",
      current_tariff_cost_eur: null,
      smart_window_cost_eur: null,
      estimated_saving_per_run_eur: null,
      smart_window: window
    };
  }

  const nowCost = cycleKwh * currentPrice(fixtures);
  const smartCost = cycleKwh * window.price_eur_per_kwh;
  const saving = Math.max(0, nowCost - smartCost);
  return {
    status: flexible ? "ready_for_schedule" : "baseline_only",
    recommendation: flexible
      ? `Plan around ${timeLabel(window.interval_start)} if the household deadline and noise preference allow it.`
      : "Keep in the baseline forecast; do not move it only for price optimization.",
    formula: powerKw !== null && runtimeMinutes !== null
      ? "energy_kwh = power_kw x runtime_hours"
      : "cycle_kwh x tariff_eur_per_kwh",
    current_tariff_cost_eur: round(nowCost, 2),
    smart_window_cost_eur: round(smartCost, 2),
    estimated_saving_per_run_eur: round(saving, 2),
    smart_window: window
  };
}

function baseDevices(fixtures) {
  const ev = fixtures.deviceState?.ev || {};
  const wallbox = fixtures.deviceState?.wallbox || {};
  const battery = fixtures.deviceState?.battery || {};
  const requiredKwh = numberOrNull(ev.required_energy_kwh) || 24;
  const batterySoc = numberOrNull(battery.soc_percent) || 62;
  return [
    {
      device_id: "base_ev",
      origin: "system_profile",
      category: "ev",
      type_label: "EV",
      name: "Family EV crossover",
      model: "Family EV crossover",
      source: "Vehicle / wallbox state",
      energy_profile: {
        cycle_kwh: requiredKwh,
        runtime_minutes: null,
        cycles_per_week: null,
        display: `${compactNumber(requiredKwh)} kWh needed; 17 kWh/100 km`
      },
      flexible_load: true,
      status: "Needs charging",
      planning: "Top action today: largest flexible load with a clear deadline.",
      data_quality: "Telemetry available"
    },
    {
      device_id: "base_wallbox",
      origin: "system_profile",
      category: "wallbox",
      type_label: "Wallbox",
      name: `${compactNumber(wallbox.max_power_kw || 11)} kW smart wallbox`,
      model: `${compactNumber(wallbox.max_power_kw || 11)} kW smart wallbox`,
      source: "Telemetry / OCPP-ready system profile",
      energy_profile: {
        power_kw: numberOrNull(wallbox.max_power_kw) || 11,
        display: `Max ${compactNumber(wallbox.max_power_kw || 11)} kW; min stable ${compactNumber(wallbox.minimum_stable_power_kw || 1.4)} kW`
      },
      flexible_load: false,
      status: "Schedules EV",
      planning: "Constraint: controls charging speed, minimum stable power, and finish time.",
      data_quality: "Telemetry available"
    },
    {
      device_id: "base_battery",
      origin: "system_profile",
      category: "battery",
      type_label: "Battery",
      name: "Home battery",
      model: "10.2 kWh home battery",
      source: "Battery telemetry",
      energy_profile: {
        display: `${compactNumber(batterySoc)}% full; evening peak buffer`
      },
      flexible_load: false,
      status: "Stores solar",
      planning: "Guardrail: reserve stored solar for evening peaks before exporting.",
      data_quality: "Telemetry available"
    },
    {
      device_id: "base_heat_pump",
      origin: "system_profile",
      category: "heat_pump",
      type_label: "Heat pump",
      name: "3.5 kW electric heat pump",
      model: "3.5 kW electric heat pump",
      source: "System profile + current telemetry",
      energy_profile: {
        power_kw: 3.5,
        runtime_minutes: 120,
        cycle_kwh: 2.4,
        display: "Comfort guarded; shiftable until 17:00"
      },
      flexible_load: true,
      status: "Flexible preheat",
      planning: "Comfort load: only small preheat shifts inside the household comfort band.",
      data_quality: "Telemetry estimate"
    }
  ].map((device) => ({
    ...device,
    advice: buildDeviceAdvice(fixtures, device)
  }));
}

function normalizeDeviceFromPayload(fixtures, payload = {}) {
  const profile = payload.product_profile || payload.profile || payload;
  const product = profile.product || {};
  const energy = profile.normalized_energy_profile || payload.energy_profile || {};
  const category = normalizeCategory(payload.category || product.category || energy.category);
  const model = String(payload.model || product.name || payload.name || `${titleCase(category)} device`).trim();
  const sourceQuality = Array.isArray(profile.source_quality) ? profile.source_quality : [];
  const energyDisplay = energy.cycle_kwh !== null && energy.cycle_kwh !== undefined
    ? `${compactNumber(energy.cycle_kwh)} kWh per run`
    : energy.power_kw !== null && energy.power_kw !== undefined
      ? `${compactNumber(energy.power_kw)} kW rated power`
      : "Energy input needed";
  const device = {
    schema_version: HOME_DEVICE_SCHEMA_VERSION,
    device_id: payload.device_id,
    origin: "user_added",
    category,
    type_label: titleCase(category),
    name: model,
    model,
    source: sourceQuality.length
      ? sourceQuality.map((item) => titleCase(item.source || item.status)).slice(0, 2).join(" + ")
      : "User product profile",
    energy_profile: {
      cycle_kwh: numberOrNull(energy.cycle_kwh),
      power_kw: numberOrNull(energy.power_kw),
      runtime_minutes: numberOrNull(energy.runtime_minutes),
      cycles_per_week: numberOrNull(energy.cycles_per_week),
      weekly_kwh: numberOrNull(energy.weekly_kwh),
      formula: energy.formula || "needs energy input",
      display: energyDisplay
    },
    flexible_load: energy.flexible_load === undefined
      ? FLEXIBLE_CATEGORIES.has(category)
      : Boolean(energy.flexible_load),
    status: energy.cycle_kwh !== null && energy.cycle_kwh !== undefined
      ? "Ready to plan"
      : "Needs energy input",
    planning: payload.planning || (energy.flexible_load === false
      ? "Baseline device: included in forecast, not automatically shifted."
      : "Added device: ask for deadline, noise preference, and latest finish time before scheduling."),
    data_quality: product.user_confirmation_required === false ? "User confirmed" : "Needs confirmation",
    added_at: payload.added_at || new Date().toISOString(),
    user_confirmation_required: product.user_confirmation_required !== false,
    source_quality: sourceQuality
  };
  device.device_id = device.device_id || makeDeviceId(device);
  device.advice = buildDeviceAdvice(fixtures, device);
  return device;
}

function listHomeDevices(rootDir, fixtures) {
  const store = readDeviceStore(rootDir);
  const customDevices = store.devices.map((device) => ({
    ...device,
    advice: buildDeviceAdvice(fixtures, device)
  }));
  const allDevices = [...baseDevices(fixtures), ...customDevices];
  return {
    schema_version: HOME_DEVICE_SCHEMA_VERSION,
    household_id: fixtures.household?.household_id || fixtures.deviceState?.household_id || "unknown_household",
    storage: {
      mode: "prototype_json_store",
      path: STORE_RELATIVE_PATH,
      production_target: "PostgreSQL device registry + TimescaleDB usage history"
    },
    device_count: allDevices.length,
    added_device_count: customDevices.length,
    devices: allDevices,
    custom_devices: customDevices,
    source_quality: [{
      field: "home_device_registry",
      source: STORE_RELATIVE_PATH,
      status: customDevices.length ? "user_added_devices_available" : "system_profile_only",
      unit: "device",
      value: allDevices.length,
      confidence: customDevices.length ? 0.82 : 0.7
    }]
  };
}

function addHomeDevice(rootDir, fixtures, payload = {}) {
  const store = readDeviceStore(rootDir);
  const device = normalizeDeviceFromPayload(fixtures, payload);
  const byId = new Map(store.devices.map((item) => [item.device_id, item]));
  const alreadyExisted = byId.has(device.device_id);
  byId.set(device.device_id, device);
  const devices = Array.from(byId.values()).sort((a, b) => String(a.added_at).localeCompare(String(b.added_at)));
  writeDeviceStore(rootDir, { devices });
  return {
    schema_version: HOME_DEVICE_SCHEMA_VERSION,
    status: alreadyExisted ? "updated_existing_device" : "added_device",
    device,
    device_registry: listHomeDevices(rootDir, fixtures)
  };
}

module.exports = {
  HOME_DEVICE_SCHEMA_VERSION,
  STORE_RELATIVE_PATH,
  addHomeDevice,
  buildDeviceAdvice,
  listHomeDevices,
  normalizeDeviceFromPayload
};
