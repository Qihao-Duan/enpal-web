const assert = require("assert");
const path = require("path");
const { loadFixtures } = require("../packages/energy-engine/fixture-store");
const {
  FORMULA_VERSION,
  calculateBillForecast,
  calculateEvRecommendation,
  calculateLiveState,
  calculatePowerIntervals,
  calculateTariffIntervals
} = require("../packages/energy-engine/energy-calculations");
const {
  CONNECTOR_VERSION,
  lookupProduct,
  makeConnectorStatus,
  parseContractText,
  refreshConnectors
} = require("../packages/energy-engine/connectors");
const {
  PROMPT_VERSION,
  answerEnergyQuestion,
  detectIntent
} = require("../packages/energy-engine/assistant");

const fixtures = loadFixtures(path.resolve(__dirname, ".."));

const recommendation = calculateEvRecommendation(fixtures);

assert.strictEqual(recommendation.ev_request.required_energy_kwh, 24);
assert.strictEqual(recommendation.naive_plan.cash_cost_eur, 8.4);
assert.strictEqual(recommendation.smart_plan.cash_cost_eur, 3.24);
assert.strictEqual(recommendation.savings.cash_savings_eur, 5.16);
assert.strictEqual(recommendation.smart_plan.solar_surplus_used_kwh, 6);
assert.strictEqual(recommendation.smart_plan.low_price_grid_energy_kwh, 18);
assert.strictEqual(recommendation.smart_plan.economic_cost_including_solar_opportunity_eur, 3.73);
assert.strictEqual(recommendation.savings.economic_savings_including_solar_opportunity_eur, 4.67);

assert.ok(recommendation.calculation.calculated_at);
assert.ok(recommendation.calculation.valid_until);
assert.ok(recommendation.calculation.input_snapshot_id);
assert.strictEqual(recommendation.calculation.formula_version, FORMULA_VERSION);
assert.ok(Array.isArray(recommendation.calculation.source_quality));
assert.ok(recommendation.calculation.source_quality.length >= 4);

const allocationOnlySolar = recommendation.smart_plan.schedule.filter((item) => item.source === "solar_surplus" && item.allocation_only);
assert.ok(allocationOnlySolar.length >= 1, "solar slices below wallbox minimum should be audit-labeled");
assert.strictEqual(recommendation.decision.control_mode, "advice_only");

const powerIntervals = calculatePowerIntervals(fixtures);
const tariffIntervals = calculateTariffIntervals(fixtures, powerIntervals);
const billForecast = calculateBillForecast(fixtures);
const liveState = calculateLiveState(fixtures);

assert.strictEqual(powerIntervals.length, 24);
assert.ok(tariffIntervals.length >= 24);
assert.ok(Number.isFinite(billForecast.total_cost_eur_excluding_ev));
assert.strictEqual(liveState.calculation.formula_version, FORMULA_VERSION);
assert.ok(Array.isArray(liveState.power_intervals));
assert.ok(Array.isArray(liveState.price_intervals));

assert.throws(
  () => calculateEvRecommendation(fixtures, { required_energy_kwh: -1 }),
  /required_energy_kwh/
);

const overrideRecommendation = calculateEvRecommendation(fixtures, { required_energy_kwh: 12 });
assert.strictEqual(overrideRecommendation.ev_request.required_energy_kwh, 12);
assert.strictEqual(overrideRecommendation.naive_plan.cash_cost_eur, 4.2);

const connectorStatus = makeConnectorStatus(fixtures);
assert.strictEqual(connectorStatus.retrieval_layer.version, CONNECTOR_VERSION);
assert.ok(connectorStatus.connectors.length >= 5);
assert.ok(connectorStatus.connectors.some((connector) => connector.id === "product_lookup"));

const retrievalRun = refreshConnectors(fixtures);
assert.strictEqual(retrievalRun.status, "completed");
assert.ok(retrievalRun.normalized_signals.some((signal) => signal.id === "ev_need"));
assert.strictEqual(retrievalRun.calculation_input_summary.ev_required_energy_kwh, 24);

const productLookup = lookupProduct(fixtures, { query: "Tesla Model Y" });
assert.strictEqual(productLookup.match_status, "candidate_found");
assert.strictEqual(productLookup.candidates[0].category, "ev");
assert.ok(productLookup.candidates[0].user_confirmation_required);

const parsedContract = parseContractText(fixtures, {
  text: "Final import price 29 ct/kWh. Basic fee 15 EUR/month. 30 days notice."
});
assert.strictEqual(parsedContract.extracted_terms.current_import_price_eur_per_kwh, 0.29);
assert.strictEqual(parsedContract.extracted_terms.standing_charge_eur_per_month, 15);
assert.strictEqual(parsedContract.extracted_terms.cancellation_notice_days, 30);

assert.strictEqual(detectIntent("Should I charge the car now?"), "ev_charging");
assert.strictEqual(detectIntent("Why is my bill high?"), "bill_high");
const assistantCharge = answerEnergyQuestion(fixtures, { question: "Should I charge the car now?" });
assert.strictEqual(assistantCharge.intent, "ev_charging");
assert.strictEqual(assistantCharge.prompt_contract.version, PROMPT_VERSION);
assert.ok(assistantCharge.answer.calculation.includes("EUR 8.40"));
assert.ok(assistantCharge.evidence.some((item) => item.label === "EV energy needed"));

const assistantBill = answerEnergyQuestion(fixtures, { question: "Why is my bill high?" });
assert.strictEqual(assistantBill.intent, "bill_high");
assert.ok(assistantBill.answer.trust.includes("tariff"));

console.log("energy calculation tests passed");
