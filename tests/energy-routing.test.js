const assert = require("assert");
const path = require("path");
const { loadFixtures } = require("../packages/energy-engine/fixture-store");
const {
  ROUTING_VERSION,
  buildRoutingSourceQuality,
  calculateEnergyRouting,
  calculateRouteAllocations,
  loadEnergyRoutingPlan,
  summarizeRouteAllocations
} = require("../packages/energy-engine/energy-routing");

const rootDir = path.resolve(__dirname, "..");
const fixtures = loadFixtures(rootDir);
const routingPlan = loadEnergyRoutingPlan(rootDir);
const routing = calculateEnergyRouting(fixtures, { routingPlan });

assert.strictEqual(routingPlan.routing_version, ROUTING_VERSION);
assert.strictEqual(routing.calculation.routing_version, ROUTING_VERSION);
assert.strictEqual(routing.calculation.plan_id, routingPlan.plan_id);
assert.strictEqual(routing.decision.control_mode, "advice_only");
assert.strictEqual(routing.decision.deadline_met, true);

assert.ok(Array.isArray(routing.route_allocations));
assert.ok(routing.route_allocations.length > 40);
assert.deepStrictEqual(
  [...new Set(routing.route_allocations.map((allocation) => allocation.action))].sort(),
  ["buy", "sell", "store", "use"]
);

assert.deepStrictEqual(routing.summary, {
  total_allocated_kwh: 74.9,
  use_kwh: 25,
  store_kwh: 17.2,
  sell_kwh: 1.7,
  buy_kwh: 31,
  solar_used_kwh: 25,
  solar_stored_kwh: 17.2,
  solar_sold_kwh: 1.7,
  grid_bought_kwh: 31,
  household_load_served_kwh: 32,
  battery_charge_kwh: 17.2,
  ev_energy_routed_kwh: 24,
  ev_solar_kwh: 6,
  ev_grid_kwh: 18,
  cash_cost_eur: 6.92,
  export_credit_eur: 0.14,
  net_cash_cost_eur: 6.78,
  opportunity_cost_eur: 3.42,
  avoided_import_cost_eur: 7.14,
  economic_cost_eur: 10.2
});

assert.strictEqual(routing.opportunity_cost.basis, "missed_feed_in_credit");
assert.strictEqual(routing.opportunity_cost.total_eur, 3.42);
assert.deepStrictEqual(routing.opportunity_cost.by_target, {
  household_load_eur: 1.54,
  battery_eur: 1.39,
  ev_charging_eur: 0.49
});

const deadlineNote = routing.deadline_notes[0];
assert.strictEqual(deadlineNote.target, "ev_charging");
assert.strictEqual(deadlineNote.required_energy_kwh, 24);
assert.strictEqual(deadlineNote.planned_energy_kwh, 24);
assert.strictEqual(deadlineNote.departure_deadline, fixtures.deviceState.ev.departure_deadline);
assert.strictEqual(deadlineNote.final_allocation_end, "2026-06-21T01:00:00+02:00");
assert.strictEqual(deadlineNote.margin_minutes, 420);
assert.strictEqual(deadlineNote.deadline_met, true);

const evGridAllocations = routing.route_allocations.filter((allocation) => (
  allocation.source === "grid" &&
  allocation.target === "ev_charging"
));
assert.strictEqual(evGridAllocations.length, 3);
assert.deepStrictEqual(evGridAllocations.map((allocation) => allocation.energy_kwh), [6, 6, 6]);
assert.ok(evGridAllocations.every((allocation) => allocation.source_status === "fixture_recommendation_schedule"));
assert.ok(evGridAllocations.every((allocation) => allocation.deadline_note.includes("before departure")));

const sourceQuality = buildRoutingSourceQuality(fixtures, routingPlan);
assert.ok(sourceQuality.some((item) => item.field === "routing_plan" && item.source === "data/energy-routing-plan.json"));
assert.ok(sourceQuality.some((item) => item.field === "ev_departure_deadline" && item.source === "data/device-state.json"));
assert.ok(sourceQuality.some((item) => item.field === "feed_in_credit" && item.unit === "EUR/kWh"));
assert.deepStrictEqual(routing.trust.source_of_truth, routing.source_quality);

const allocations = calculateRouteAllocations(fixtures, { routingPlan });
assert.deepStrictEqual(summarizeRouteAllocations(allocations), routing.summary);

const fallbackRouting = calculateEnergyRouting(
  { ...fixtures, recommendationFixture: null },
  { routingPlan }
);
const fallbackEvGridAllocations = fallbackRouting.route_allocations.filter((allocation) => (
  allocation.source === "grid" &&
  allocation.target === "ev_charging"
));
assert.deepStrictEqual(fallbackEvGridAllocations.map((allocation) => allocation.energy_kwh), [11, 7]);
assert.ok(fallbackEvGridAllocations.every((allocation) => (
  allocation.source_status === "deterministic_lowest_price_before_deadline"
)));
assert.strictEqual(fallbackRouting.deadline_notes[0].deadline_met, true);
assert.strictEqual(fallbackRouting.deadline_notes[0].final_allocation_end, "2026-06-21T00:00:00+02:00");

assert.throws(
  () => calculateEnergyRouting({ ...fixtures, forecast: { ...fixtures.forecast, hours: null } }, { routingPlan }),
  /forecast\.hours/
);

console.log("energy routing tests passed");
