const assert = require("assert");
const path = require("path");
const { loadFixtures } = require("../src/lib/fixture-store");
const { listHomeDevices } = require("../src/lib/home-device-store");
const {
  PLAN_VERSION,
  buildContractUpload,
  buildDeviceReadiness,
  buildProfileCurrent,
  buildProfileReadiness,
  calculateOptimizationPlan,
  confirmContract,
  findDevice,
  getCurrentPlan,
  loadMunichFactoryProfile,
  scanProduct
} = require("../src/lib/energy-plans");

const rootDir = path.resolve(__dirname, "..");
const fixtures = loadFixtures(rootDir);
const registry = listHomeDevices(rootDir, fixtures);

const planCatalog = getCurrentPlan(fixtures);
assert.strictEqual(planCatalog.current_plan_tier, "premium");
assert.strictEqual(planCatalog.tiers.basic.features.solar_export_optimizer.status, "locked");
assert.strictEqual(planCatalog.tiers.premium.features.solar_export_optimizer.status, "available");

const profile = buildProfileCurrent(fixtures, {
  preferences: {
    priority: "comfort_first"
  }
});
assert.strictEqual(profile.status, "user_confirmed_mock");
assert.strictEqual(profile.preferences.priority, "comfort_first");
assert.ok(profile.source_quality.some((item) => item.field === "device_state"));

const readiness = buildProfileReadiness(fixtures, registry);
assert.strictEqual(readiness.household_id, fixtures.household.household_id);
assert.ok(readiness.readiness_percent >= 60);
assert.ok(readiness.checks.some((item) => item.id === "contract_terms" && item.status === "ready"));
assert.ok(readiness.checks.some((item) => item.id === "user_confirmation" && item.status === "needs_confirmation"));

const basicPlan = calculateOptimizationPlan(fixtures, {
  plan_tier: "basic",
  ev_request: {
    required_energy_kwh: 24
  }
}, { rootDir });
assert.strictEqual(basicPlan.plan_version, PLAN_VERSION);
assert.strictEqual(basicPlan.plan_tier, "basic");
assert.strictEqual(basicPlan.recommendation.ev_request.required_energy_kwh, 24);
assert.strictEqual(basicPlan.summary.normal_cost_eur, 8.4);
assert.strictEqual(basicPlan.summary.optimized_cash_cost_eur, 3.24);
assert.strictEqual(basicPlan.summary.cash_savings_eur, 5.16);
assert.strictEqual(basicPlan.plan_access.features.solar_export_optimizer.status, "locked");
assert.ok(Array.isArray(basicPlan.route_allocations));
assert.ok(basicPlan.route_allocations.every((item) => item.target === "ev_charging"));
assert.ok(basicPlan.route_allocations.every((item) => Array.isArray(item.constraint_binding)));
assert.ok(basicPlan.route_allocations.every((item) => item.counterfactual));
assert.ok(basicPlan.audit.input_snapshot_id);
assert.ok(basicPlan.algorithm_outputs.headline_metrics.ready_by);

const premiumPlan = calculateOptimizationPlan(fixtures, { plan_tier: "premium" }, { rootDir });
assert.strictEqual(premiumPlan.plan_tier, "premium");
assert.strictEqual(premiumPlan.plan_access.features.solar_export_optimizer.status, "available");
assert.strictEqual(premiumPlan.summary.route_summary.store_kwh, 17.2);
assert.strictEqual(premiumPlan.summary.route_summary.sell_kwh, 1.7);
assert.strictEqual(premiumPlan.energy_routing.summary.buy_kwh, 31);
assert.ok(premiumPlan.route_allocations.some((item) => item.action === "sell"));
assert.ok(premiumPlan.route_allocations.some((item) => item.constraint_binding.includes("feed_in_opportunity_cost")));
assert.ok(premiumPlan.source_quality.length >= basicPlan.source_quality.length);
assert.ok(premiumPlan.audit.routing_version);

const factoryProfile = loadMunichFactoryProfile(rootDir);
assert.strictEqual(factoryProfile.factory.city, "Munich");
assert.strictEqual(factoryProfile.profile_type, "synthetic_industrial_demo");

const factoryPlan = calculateOptimizationPlan(fixtures, {
  plan_tier: "premium",
  site_type: "factory_demo",
  profile_key: "munich"
}, { rootDir });
assert.strictEqual(factoryPlan.site_context.site_type, "factory_demo");
assert.strictEqual(factoryPlan.site_context.city, "Munich");
assert.ok(factoryPlan.summary.premium_demo_value_eur > factoryPlan.summary.basic_demo_value_eur * 10);
assert.ok(factoryPlan.summary.premium_lift_vs_basic_eur > 17000);
assert.ok(factoryPlan.algorithm_outputs.headline_metrics.premium_demo_value_eur);
assert.ok(factoryPlan.limitations.some((item) => /synthetic demo/i.test(item)));
assert.strictEqual(Object.prototype.hasOwnProperty.call(factoryPlan.summary, "measured_profit_eur"), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(factoryPlan.business_case, "measured_profit_eur"), false);

const baseEv = findDevice(registry, "base_ev");
const evReadiness = buildDeviceReadiness(baseEv);
assert.strictEqual(evReadiness.device_id, "base_ev");
assert.strictEqual(evReadiness.ready_for_schedule, true);

const missingDeviceReadiness = buildDeviceReadiness(null);
assert.strictEqual(missingDeviceReadiness.status, "not_found");
assert.strictEqual(missingDeviceReadiness.ready_for_schedule, false);

const scan = scanProduct(fixtures, {
  text: "Bosch Serie 6 dishwasher 1.05 kWh per cycle 150 min 5 cycles per week"
});
assert.strictEqual(scan.status, "terms_extracted_from_text_demo");
assert.strictEqual(scan.profile.normalized_energy_profile.cycle_kwh, 1.05);
assert.strictEqual(scan.profile.product.user_confirmation_required, true);

const uploadedContract = buildContractUpload(fixtures, {
  file_name: "tariff.pdf",
  text: "Final import price 29 ct/kWh. Basic fee 15 EUR/month. 30 days notice."
});
assert.strictEqual(uploadedContract.status, "terms_extracted");
assert.strictEqual(uploadedContract.parsed_terms.current_import_price_eur_per_kwh, 0.29);
assert.strictEqual(uploadedContract.needs_user_confirmation, true);

const confirmedContract = confirmContract(fixtures, uploadedContract.contract_id, {
  parsed_terms: uploadedContract.parsed_terms
});
assert.strictEqual(confirmedContract.status, "confirmed_source_of_truth_demo");
assert.strictEqual(confirmedContract.confirmed_terms.current_import_price_eur_per_kwh, 0.29);

console.log("energy plan tests passed");
