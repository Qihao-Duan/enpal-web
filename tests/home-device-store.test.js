const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadFixtures } = require("../packages/energy-engine/fixture-store");
const { buildProductUsageProfile } = require("../packages/energy-engine/connectors");
const {
  STORE_RELATIVE_PATH,
  addHomeDevice,
  listHomeDevices,
  normalizeDeviceFromPayload
} = require("../packages/energy-engine/home-device-store");

const repoRoot = path.resolve(__dirname, "..");
const fixtures = loadFixtures(repoRoot);
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "enpal-devices-"));
fs.mkdirSync(path.join(tmpRoot, "data"), { recursive: true });

const dishwasherProfile = buildProductUsageProfile(fixtures, {
  query: "Bosch Serie 6 dishwasher",
  category: "dishwasher",
  natural_text: "Bosch Serie 6 dishwasher 1.05 kWh per cycle 150 min 5 cycles per week"
});

const normalized = normalizeDeviceFromPayload(fixtures, {
  product_profile: dishwasherProfile
});
assert.strictEqual(normalized.category, "dishwasher");
assert.strictEqual(normalized.energy_profile.cycle_kwh, 1.05);
assert.strictEqual(normalized.flexible_load, true);
assert.strictEqual(normalized.advice.status, "ready_for_schedule");
assert.ok(normalized.advice.estimated_saving_per_run_eur > 0);

const addResult = addHomeDevice(tmpRoot, fixtures, {
  product_profile: dishwasherProfile
});

assert.strictEqual(addResult.status, "added_device");
assert.ok(fs.existsSync(path.join(tmpRoot, STORE_RELATIVE_PATH)));
assert.strictEqual(addResult.device.category, "dishwasher");
assert.strictEqual(addResult.device_registry.added_device_count, 1);

const listResult = listHomeDevices(tmpRoot, fixtures);
assert.ok(listResult.device_count > listResult.added_device_count);
assert.strictEqual(listResult.custom_devices.length, 1);
assert.ok(listResult.devices.some((device) => device.device_id === addResult.device.device_id));

const missingEnergy = addHomeDevice(tmpRoot, fixtures, {
  category: "dehumidifier",
  model: "Unknown basement dehumidifier",
  energy_profile: {
    cycle_kwh: null,
    flexible_load: true
  }
});
assert.strictEqual(missingEnergy.device.advice.status, "needs_energy_confirmation");
assert.strictEqual(missingEnergy.device.advice.current_tariff_cost_eur, null);
assert.strictEqual(missingEnergy.device_registry.added_device_count, 2);

const updateResult = addHomeDevice(tmpRoot, fixtures, {
  device_id: addResult.device.device_id,
  product_profile: dishwasherProfile
});
assert.strictEqual(updateResult.status, "updated_existing_device");
assert.strictEqual(updateResult.device_registry.added_device_count, 2);

console.log("home device store tests passed");
