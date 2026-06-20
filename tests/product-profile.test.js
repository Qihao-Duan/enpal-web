const assert = require("assert");
const path = require("path");
const { loadFixtures } = require("../src/lib/fixture-store");
const { buildProductUsageProfile } = require("../src/lib/connectors");

const rootDir = path.resolve(__dirname, "..");
const fixtures = loadFixtures(rootDir);

const dishwasherProfile = buildProductUsageProfile(fixtures, {
  query: "Bosch Serie 6 dishwasher",
  category: "dishwasher",
  product_details: {
    cycle_kwh: 1.05,
    cycles_per_week: 5,
    flexible_load: true
  }
});

assert.strictEqual(dishwasherProfile.product.category, "dishwasher");
assert.strictEqual(dishwasherProfile.product.match_status, "candidate_found");
assert.strictEqual(dishwasherProfile.normalized_energy_profile.cycle_kwh, 1.05);
assert.strictEqual(dishwasherProfile.normalized_energy_profile.weekly_kwh, 5.25);
assert.strictEqual(dishwasherProfile.normalized_energy_profile.flexible_load, true);
assert.ok(dishwasherProfile.optimization_preview.estimated_saving_per_run_eur > 0);
assert.ok(dishwasherProfile.optimization_preview.recommendation.includes("cheapest"));
assert.ok(dishwasherProfile.ai_planning_context.prompt_facts.some((fact) => fact.includes("Energy per run")));
assert.ok(dishwasherProfile.source_quality.some((item) => item.status === "user_confirmed"));

const ocrProfile = buildProductUsageProfile(fixtures, {
  photo_ocr_text: "Energy label: Miele W1 washing machine 0.47 kWh per cycle 180 min 4 cycles per week",
  category: "washing_machine"
});

assert.strictEqual(ocrProfile.product.category, "washing_machine");
assert.strictEqual(ocrProfile.normalized_energy_profile.cycle_kwh, 0.47);
assert.strictEqual(ocrProfile.normalized_energy_profile.runtime_minutes, 180);
assert.strictEqual(ocrProfile.normalized_energy_profile.weekly_kwh, 1.88);
assert.ok(ocrProfile.intake_modes.accepted_now.includes("ocr_text_from_photo"));
assert.ok(ocrProfile.external_retrieval_design.public_sources.some((source) => source.includes("EPREL")));

const powerProfile = buildProductUsageProfile(fixtures, {
  natural_text: "portable heater 1200 W for 45 minutes, 3 times per week",
  category: "heater"
});

assert.strictEqual(powerProfile.normalized_energy_profile.power_kw, 1.2);
assert.strictEqual(powerProfile.normalized_energy_profile.cycle_kwh, 0.9);
assert.strictEqual(powerProfile.normalized_energy_profile.cycles_per_week, 3);
assert.strictEqual(powerProfile.normalized_energy_profile.weekly_kwh, 2.7);

const missingEnergyProfile = buildProductUsageProfile(fixtures, {
  natural_text: "old basement dehumidifier, brand unknown",
  category: "unknown"
});

assert.strictEqual(missingEnergyProfile.normalized_energy_profile.cycle_kwh, null);
assert.strictEqual(missingEnergyProfile.optimization_preview.current_tariff_cost_eur, null);
assert.ok(missingEnergyProfile.optimization_preview.recommendation.includes("Confirm"));
assert.ok(missingEnergyProfile.source_quality.some((item) => item.status === "missing_energy_input"));

console.log("product profile tests passed");
