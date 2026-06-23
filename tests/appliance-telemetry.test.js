const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadFixtures } = require("../packages/energy-engine/fixture-store");
const {
  STORE_RELATIVE_PATH,
  getTodayApplianceTelemetry,
  ingestApplianceTelemetry,
  normalizeReading
} = require("../packages/energy-engine/appliance-telemetry-store");
const { calculateEnergyRouting, loadEnergyRoutingPlan } = require("../packages/energy-engine/energy-routing");

const repoRoot = path.resolve(__dirname, "..");
const fixtures = loadFixtures(repoRoot);
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "enpal-telemetry-"));
fs.mkdirSync(path.join(tmpRoot, "data"), { recursive: true });

const derived = normalizeReading({
  household_id: fixtures.household.household_id,
  device_id: "heatpump_demo_001",
  device_type: "heat pump",
  interval_start: "2026-06-20T14:00:00+02:00",
  interval_end: "2026-06-20T16:00:00+02:00",
  power_kw: 1.5
}, fixtures);
assert.strictEqual(derived.device_type, "heat_pump");
assert.strictEqual(derived.energy_kwh, 3);
assert.strictEqual(derived.flexible_load, true);

const ingestResult = ingestApplianceTelemetry(tmpRoot, fixtures, {
  readings: [
    {
      household_id: fixtures.household.household_id,
      device_id: "dishwasher_demo_001",
      device_type: "dishwasher",
      interval_start: "2026-06-20T22:00:00+02:00",
      interval_end: "2026-06-20T23:30:00+02:00",
      energy_kwh: 1.2,
      source: {
        name: "Smart plug",
        adapter: "home_assistant",
        status: "actual",
        confidence: 0.91
      }
    },
    {
      household_id: fixtures.household.household_id,
      device_id: "heatpump_demo_001",
      device_type: "heat pump",
      interval_start: "2026-06-20T14:00:00+02:00",
      interval_end: "2026-06-20T16:00:00+02:00",
      power_kw: 1.5,
      provider: "Heat pump cloud"
    },
    {
      household_id: fixtures.household.household_id,
      device_id: "fridge_demo_001",
      device_type: "fridge",
      interval_start: "2026-06-20T00:00:00+02:00",
      interval_end: "2026-06-20T10:00:00+02:00",
      energy_kwh: 0.25,
      flexible_load: false
    }
  ]
});

assert.strictEqual(ingestResult.inserted_count, 3);
assert.strictEqual(ingestResult.stored_count, 3);
assert.ok(fs.existsSync(path.join(tmpRoot, STORE_RELATIVE_PATH)));

const today = getTodayApplianceTelemetry(tmpRoot, fixtures, { date: "2026-06-20" });
assert.strictEqual(today.status, "actual_readings_available");
assert.strictEqual(today.device_count, 3);
assert.strictEqual(today.total_actual_kwh, 4.45);
assert.strictEqual(today.flexible_actual_kwh, 4.2);
assert.strictEqual(today.baseline_actual_kwh, 0.25);
assert.deepStrictEqual(today.optimizer_inputs.actual_device_energy_kwh, {
  heatpump_demo_001: 3,
  dishwasher_demo_001: 1.2,
  fridge_demo_001: 0.25
});
assert.strictEqual(today.optimizer_inputs.top_device_today.device_id, "heatpump_demo_001");
assert.strictEqual(today.source_quality[0].status, "actual");

const routing = calculateEnergyRouting(fixtures, {
  routingPlan: loadEnergyRoutingPlan(repoRoot),
  applianceTelemetry: today
});
assert.strictEqual(routing.appliance_telemetry.status, "actual_readings_available");
assert.ok(routing.calculation.input_snapshot_id.includes(today.optimizer_inputs.input_snapshot_id));
assert.ok(routing.source_quality.some((item) => (
  item.field === "appliance_telemetry_today" &&
  item.status === "actual" &&
  item.value === 4.45
)));

const emptyToday = getTodayApplianceTelemetry(tmpRoot, fixtures, { date: "2026-06-21" });
assert.strictEqual(emptyToday.status, "no_appliance_readings_today");
assert.strictEqual(emptyToday.optimizer_inputs.flexible_load_actual_kwh, 0);

assert.throws(
  () => ingestApplianceTelemetry(tmpRoot, fixtures, { energy_kwh: 1 }),
  /device_id is required/
);

console.log("appliance telemetry tests passed");
