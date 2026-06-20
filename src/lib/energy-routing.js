const fs = require("fs");
const path = require("path");

const ROUTING_VERSION = "energy-routing.v0.1.0";
const ACTION_ORDER = {
  use: 1,
  store: 2,
  sell: 3,
  buy: 4
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadEnergyRoutingPlan(rootDir = path.resolve(__dirname, "../..")) {
  return readJson(path.join(rootDir, "data", "energy-routing-plan.json"));
}

function resolveRoutingPlan(options = {}) {
  if (options.plan_id) return options;
  if (options.routingPlan) return options.routingPlan;
  if (options.plan) return options.plan;
  return loadEnergyRoutingPlan(options.rootDir);
}

function intervalHoursFromGranularity(granularity) {
  if (granularity === "PT15M") return 0.25;
  if (granularity === "PT30M") return 0.5;
  const match = String(granularity || "").match(/^PT(\d+(?:\.\d+)?)H$/);
  return match ? Number(match[1]) : 1;
}

function intervalEnd(forecast, index) {
  if (forecast.hours[index + 1]) return forecast.hours[index + 1].hour_start;
  if (forecast.horizon?.end) return forecast.horizon.end;

  const intervalMs = intervalHoursFromGranularity(forecast.granularity) * 60 * 60 * 1000;
  return new Date(new Date(forecast.hours[index].hour_start).getTime() + intervalMs)
    .toISOString()
    .replace(".000Z", "Z");
}

function findPriorityRule(plan, action, source, target) {
  return (plan.priority_order || []).find((rule) => (
    rule.action === action &&
    rule.source === source &&
    rule.target === target
  ));
}

function compareTimestamp(a, b) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function isBeforeOrAt(timestamp, deadline) {
  return compareTimestamp(timestamp, deadline) <= 0;
}

function makeAllocation(plan, input) {
  const energyKwh = round(positiveNumber(input.energy_kwh), 3);
  if (energyKwh <= 0) return null;

  const importPrice = positiveNumber(input.import_price_eur_per_kwh);
  const exportPrice = positiveNumber(input.export_price_eur_per_kwh);
  const price = input.action === "sell" ? exportPrice : importPrice;
  const rule = findPriorityRule(plan, input.action, input.source, input.target);
  const cashCost = input.action === "buy" ? energyKwh * price : 0;
  const exportCredit = input.action === "sell" ? energyKwh * exportPrice : 0;
  const opportunityCost = input.source === "solar" && input.action !== "sell"
    ? energyKwh * exportPrice
    : 0;
  const avoidedImportCost = input.source === "solar" && (
    input.target === "household_load" ||
    input.target === "ev_charging"
  )
    ? energyKwh * importPrice
    : 0;

  return {
    interval_start: input.interval_start,
    interval_end: input.interval_end,
    action: input.action,
    source: input.source,
    target: input.target,
    energy_kwh: energyKwh,
    price_eur_per_kwh: round(price, 3),
    cash_cost_eur: round(cashCost, 3),
    export_credit_eur: round(exportCredit, 3),
    opportunity_cost_eur: round(opportunityCost, 3),
    avoided_import_cost_eur: round(avoidedImportCost, 3),
    source_status: input.source_status,
    source_file: input.source_file,
    confidence: round(positiveNumber(input.confidence, 0.75), 2),
    reason: input.reason || rule?.reason || "Deterministic routing allocation.",
    deadline_note: input.deadline_note
  };
}

function sortAllocations(allocations) {
  return allocations.slice().sort((a, b) => {
    const timeDiff = compareTimestamp(a.interval_start, b.interval_start);
    if (timeDiff !== 0) return timeDiff;

    const actionDiff = (ACTION_ORDER[a.action] || 99) - (ACTION_ORDER[b.action] || 99);
    if (actionDiff !== 0) return actionDiff;

    return `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`);
  });
}

function validateFixtures(fixtures) {
  if (!fixtures?.forecast?.hours || !Array.isArray(fixtures.forecast.hours)) {
    throw Object.assign(new Error("forecast.hours must be available for energy routing."), { statusCode: 400 });
  }
  if (!fixtures?.contract?.price_rules) {
    throw Object.assign(new Error("contract.price_rules must be available for energy routing."), { statusCode: 400 });
  }
  if (!fixtures?.deviceState?.ev || !fixtures?.deviceState?.wallbox) {
    throw Object.assign(new Error("deviceState.ev and deviceState.wallbox must be available for energy routing."), { statusCode: 400 });
  }
}

function buildSolarAndLoadAllocations(fixtures, plan) {
  const allocations = [];
  const forecast = fixtures.forecast;
  const evRequiredKwh = positiveNumber(fixtures.deviceState.ev.required_energy_kwh);
  let remainingEvSolarNeedKwh = evRequiredKwh;

  forecast.hours.forEach((hour, index) => {
    const interval_start = hour.hour_start;
    const interval_end = intervalEnd(forecast, index);
    const importPrice = positiveNumber(hour.grid_import_price_eur_per_kwh);
    const exportPrice = positiveNumber(hour.solar_export_price_eur_per_kwh);
    const confidence = positiveNumber(hour.confidence, 0.75);
    const householdLoadKwh = positiveNumber(hour.household_load_forecast_kwh_excluding_ev);
    const batteryReservedKwh = positiveNumber(hour.battery_charge_reserved_kwh);
    const evSolarSurplusKwh = positiveNumber(hour.ev_usable_solar_surplus_kwh);
    let remainingSolarKwh = positiveNumber(hour.pv_generation_forecast_kwh);

    const solarToHomeKwh = Math.min(remainingSolarKwh, householdLoadKwh);
    remainingSolarKwh = round(remainingSolarKwh - solarToHomeKwh, 6);
    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "use",
      source: "solar",
      target: "household_load",
      energy_kwh: solarToHomeKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast",
      source_file: "data/forecasts-24h.json",
      confidence
    }));

    const solarToBatteryKwh = Math.min(remainingSolarKwh, batteryReservedKwh);
    remainingSolarKwh = round(remainingSolarKwh - solarToBatteryKwh, 6);
    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "store",
      source: "solar",
      target: "battery",
      energy_kwh: solarToBatteryKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast_battery_reservation",
      source_file: "data/forecasts-24h.json",
      confidence
    }));

    const solarToEvKwh = Math.min(remainingSolarKwh, evSolarSurplusKwh, remainingEvSolarNeedKwh);
    remainingSolarKwh = round(remainingSolarKwh - solarToEvKwh, 6);
    remainingEvSolarNeedKwh = round(remainingEvSolarNeedKwh - solarToEvKwh, 6);
    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "use",
      source: "solar",
      target: "ev_charging",
      energy_kwh: solarToEvKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast_ev_usable_solar_surplus",
      source_file: "data/forecasts-24h.json",
      confidence,
      deadline_note: "Counts toward the EV charging target before the departure deadline."
    }));

    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "sell",
      source: "solar",
      target: "grid_export",
      energy_kwh: remainingSolarKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast_export_after_local_allocations",
      source_file: "data/forecasts-24h.json",
      confidence
    }));

    const gridToHomeKwh = Math.max(0, householdLoadKwh - solarToHomeKwh);
    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "buy",
      source: "grid",
      target: "household_load",
      energy_kwh: gridToHomeKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast_final_customer_price",
      source_file: "data/forecasts-24h.json",
      confidence
    }));

    const gridToBatteryKwh = Math.max(0, batteryReservedKwh - solarToBatteryKwh);
    allocations.push(makeAllocation(plan, {
      interval_start,
      interval_end,
      action: "buy",
      source: "grid",
      target: "battery",
      energy_kwh: gridToBatteryKwh,
      import_price_eur_per_kwh: importPrice,
      export_price_eur_per_kwh: exportPrice,
      source_status: "forecast_battery_reservation_gap",
      source_file: "data/forecasts-24h.json",
      confidence,
      reason: "Buy grid electricity only if the forecast battery reservation cannot be met by solar."
    }));
  });

  return allocations.filter(Boolean);
}

function getEvFixtureGridSchedule(fixtures, plan) {
  if (!plan.ev_policy?.use_recommendation_fixture_schedule) return [];
  const schedule = fixtures.recommendationFixture?.smart_plan?.schedule;
  if (!Array.isArray(schedule)) return [];

  return schedule.filter((item) => (
    item.source === "grid_low_price" ||
    item.source === "grid_fallback" ||
    item.source === "grid"
  ));
}

function buildEvGridAllocationsFromFixture(fixtures, plan, remainingEvKwh) {
  const deadline = fixtures.deviceState.ev.departure_deadline;
  const entries = getEvFixtureGridSchedule(fixtures, plan);
  const allocations = [];
  let remaining = round(remainingEvKwh, 3);

  entries.forEach((entry) => {
    if (remaining <= 0) return;
    if (!isBeforeOrAt(entry.end, deadline)) return;

    const energyKwh = Math.min(positiveNumber(entry.energy_kwh), remaining);
    remaining = round(remaining - energyKwh, 3);
    allocations.push(makeAllocation(plan, {
      interval_start: entry.start,
      interval_end: entry.end,
      action: "buy",
      source: "grid",
      target: "ev_charging",
      energy_kwh: energyKwh,
      import_price_eur_per_kwh: positiveNumber(
        entry.cash_price_eur_per_kwh,
        fixtures.contract.ev_charging_demo_terms?.low_price_window?.final_import_price_eur_per_kwh
      ),
      export_price_eur_per_kwh: fixtures.contract.price_rules.feed_in_credit_eur_per_kwh,
      source_status: "fixture_recommendation_schedule",
      source_file: "data/ev-charging-recommendation.json",
      confidence: fixtures.recommendationFixture?.decision?.confidence || 0.78,
      deadline_note: "Fixture recommendation schedule completes EV charging before departure."
    }));
  });

  return {
    allocations: allocations.filter(Boolean),
    remaining_ev_kwh: remaining
  };
}

function evEnergyByIntervalStart(allocations) {
  return allocations
    .filter((allocation) => allocation.target === "ev_charging")
    .reduce((index, allocation) => {
      index[allocation.interval_start] = round((index[allocation.interval_start] || 0) + allocation.energy_kwh, 3);
      return index;
    }, {});
}

function buildFallbackEvGridAllocations(fixtures, plan, existingEvAllocations, remainingEvKwh) {
  const forecast = fixtures.forecast;
  const deadline = fixtures.deviceState.ev.departure_deadline;
  const intervalHours = intervalHoursFromGranularity(forecast.granularity);
  const wallboxMaxKwh = positiveNumber(fixtures.deviceState.wallbox.max_power_kw) * intervalHours;
  const occupiedByStart = evEnergyByIntervalStart(existingEvAllocations);
  const sortedHours = forecast.hours
    .map((hour, index) => ({
      hour,
      index,
      interval_end: intervalEnd(forecast, index)
    }))
    .filter((item) => isBeforeOrAt(item.interval_end, deadline))
    .sort((a, b) => {
      const priceDiff = positiveNumber(a.hour.grid_import_price_eur_per_kwh) - positiveNumber(b.hour.grid_import_price_eur_per_kwh);
      if (priceDiff !== 0) return priceDiff;
      return compareTimestamp(a.hour.hour_start, b.hour.hour_start);
    });

  const allocations = [];
  let remaining = round(remainingEvKwh, 3);

  sortedHours.forEach(({ hour, interval_end }) => {
    if (remaining <= 0) return;

    const occupiedKwh = occupiedByStart[hour.hour_start] || 0;
    const availableKwh = Math.max(0, wallboxMaxKwh - occupiedKwh);
    const energyKwh = Math.min(availableKwh, remaining);
    remaining = round(remaining - energyKwh, 3);
    allocations.push(makeAllocation(plan, {
      interval_start: hour.hour_start,
      interval_end,
      action: "buy",
      source: "grid",
      target: "ev_charging",
      energy_kwh: energyKwh,
      import_price_eur_per_kwh: hour.grid_import_price_eur_per_kwh,
      export_price_eur_per_kwh: hour.solar_export_price_eur_per_kwh,
      source_status: "deterministic_lowest_price_before_deadline",
      source_file: "data/forecasts-24h.json",
      confidence: hour.confidence,
      deadline_note: "Fallback routing buys the cheapest available grid energy before the EV departure deadline."
    }));
  });

  return {
    allocations: allocations.filter(Boolean),
    remaining_ev_kwh: remaining
  };
}

function buildEvGridAllocations(fixtures, plan, baseAllocations) {
  const evRequiredKwh = positiveNumber(fixtures.deviceState.ev.required_energy_kwh);
  const evSolarKwh = sumBy(
    baseAllocations,
    (allocation) => allocation.source === "solar" && allocation.target === "ev_charging",
    "energy_kwh"
  );
  let remainingEvKwh = round(Math.max(0, evRequiredKwh - evSolarKwh), 3);

  const fixtureResult = buildEvGridAllocationsFromFixture(fixtures, plan, remainingEvKwh);
  const fixtureAllocations = fixtureResult.allocations;
  remainingEvKwh = fixtureResult.remaining_ev_kwh;

  if (remainingEvKwh <= 0) return fixtureAllocations;

  const fallbackResult = buildFallbackEvGridAllocations(
    fixtures,
    plan,
    baseAllocations.concat(fixtureAllocations),
    remainingEvKwh
  );
  return fixtureAllocations.concat(fallbackResult.allocations);
}

function calculateRouteAllocations(fixtures, options = {}) {
  validateFixtures(fixtures);
  const plan = resolveRoutingPlan(options);
  const baseAllocations = buildSolarAndLoadAllocations(fixtures, plan);
  const evGridAllocations = buildEvGridAllocations(fixtures, plan, baseAllocations);
  return sortAllocations(baseAllocations.concat(evGridAllocations));
}

function sumBy(items, predicate, fieldName) {
  return items.reduce((sum, item) => {
    if (predicate && !predicate(item)) return sum;
    return sum + positiveNumber(item[fieldName]);
  }, 0);
}

function summarizeRouteAllocations(allocations) {
  const summary = {
    total_allocated_kwh: round(sumBy(allocations, null, "energy_kwh"), 3),
    use_kwh: round(sumBy(allocations, (item) => item.action === "use", "energy_kwh"), 3),
    store_kwh: round(sumBy(allocations, (item) => item.action === "store", "energy_kwh"), 3),
    sell_kwh: round(sumBy(allocations, (item) => item.action === "sell", "energy_kwh"), 3),
    buy_kwh: round(sumBy(allocations, (item) => item.action === "buy", "energy_kwh"), 3),
    solar_used_kwh: round(sumBy(allocations, (item) => item.source === "solar" && item.action === "use", "energy_kwh"), 3),
    solar_stored_kwh: round(sumBy(allocations, (item) => item.source === "solar" && item.action === "store", "energy_kwh"), 3),
    solar_sold_kwh: round(sumBy(allocations, (item) => item.source === "solar" && item.action === "sell", "energy_kwh"), 3),
    grid_bought_kwh: round(sumBy(allocations, (item) => item.source === "grid" && item.action === "buy", "energy_kwh"), 3),
    household_load_served_kwh: round(sumBy(allocations, (item) => item.target === "household_load", "energy_kwh"), 3),
    battery_charge_kwh: round(sumBy(allocations, (item) => item.target === "battery", "energy_kwh"), 3),
    ev_energy_routed_kwh: round(sumBy(allocations, (item) => item.target === "ev_charging", "energy_kwh"), 3),
    ev_solar_kwh: round(sumBy(allocations, (item) => item.source === "solar" && item.target === "ev_charging", "energy_kwh"), 3),
    ev_grid_kwh: round(sumBy(allocations, (item) => item.source === "grid" && item.target === "ev_charging", "energy_kwh"), 3),
    cash_cost_eur: round(sumBy(allocations, null, "cash_cost_eur"), 2),
    export_credit_eur: round(sumBy(allocations, null, "export_credit_eur"), 2),
    net_cash_cost_eur: 0,
    opportunity_cost_eur: round(sumBy(allocations, null, "opportunity_cost_eur"), 2),
    avoided_import_cost_eur: round(sumBy(allocations, null, "avoided_import_cost_eur"), 2),
    economic_cost_eur: 0
  };

  summary.net_cash_cost_eur = round(summary.cash_cost_eur - summary.export_credit_eur, 2);
  summary.economic_cost_eur = round(summary.net_cash_cost_eur + summary.opportunity_cost_eur, 2);
  return summary;
}

function buildOpportunityCost(allocations, fixtures, summary) {
  return {
    basis: "missed_feed_in_credit",
    feed_in_credit_eur_per_kwh: fixtures.contract.price_rules.feed_in_credit_eur_per_kwh,
    total_eur: summary.opportunity_cost_eur,
    by_target: {
      household_load_eur: round(sumBy(
        allocations,
        (item) => item.source === "solar" && item.target === "household_load",
        "opportunity_cost_eur"
      ), 2),
      battery_eur: round(sumBy(
        allocations,
        (item) => item.source === "solar" && item.target === "battery",
        "opportunity_cost_eur"
      ), 2),
      ev_charging_eur: round(sumBy(
        allocations,
        (item) => item.source === "solar" && item.target === "ev_charging",
        "opportunity_cost_eur"
      ), 2)
    },
    note: "Solar routed to use or store has zero cash cost in the prototype, but carries the missed feed-in credit that would have been earned by selling it."
  };
}

function buildDeadlineNotes(fixtures, allocations) {
  const deadline = fixtures.deviceState.ev.departure_deadline;
  const requiredEnergyKwh = positiveNumber(fixtures.deviceState.ev.required_energy_kwh);
  const evAllocations = allocations.filter((allocation) => allocation.target === "ev_charging");
  const plannedEnergyKwh = round(sumBy(evAllocations, null, "energy_kwh"), 3);
  const latestEnd = evAllocations.reduce((latest, allocation) => {
    if (!latest || compareTimestamp(allocation.interval_end, latest) > 0) return allocation.interval_end;
    return latest;
  }, null);
  const allBeforeDeadline = evAllocations.every((allocation) => isBeforeOrAt(allocation.interval_end, deadline));
  const deadlineMet = plannedEnergyKwh + 0.0001 >= requiredEnergyKwh && allBeforeDeadline;
  const marginMinutes = latestEnd
    ? Math.floor((new Date(deadline).getTime() - new Date(latestEnd).getTime()) / 60000)
    : null;

  return [
    {
      target: "ev_charging",
      required_energy_kwh: requiredEnergyKwh,
      planned_energy_kwh: plannedEnergyKwh,
      departure_deadline: deadline,
      final_allocation_end: latestEnd,
      margin_minutes: marginMinutes,
      deadline_met: deadlineMet,
      note: deadlineMet
        ? `EV routing completes ${plannedEnergyKwh.toFixed(1)} kWh before the ${deadline} departure deadline.`
        : `EV routing only covers ${plannedEnergyKwh.toFixed(1)} of ${requiredEnergyKwh.toFixed(1)} kWh before the ${deadline} departure deadline.`
    }
  ];
}

function averageForecastConfidence(fixtures) {
  const confidences = fixtures.forecast.hours
    .map((hour) => positiveNumber(hour.confidence, NaN))
    .filter((value) => Number.isFinite(value));

  if (!confidences.length) return 0.75;
  return round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length, 2);
}

function buildRoutingSourceQuality(fixtures, plan) {
  const forecastConfidence = averageForecastConfidence(fixtures);
  const solarSurplusKwh = fixtures.forecast.summary?.ev_usable_solar_surplus_kwh ??
    sumBy(fixtures.forecast.hours, null, "ev_usable_solar_surplus_kwh");

  return [
    {
      field: "routing_plan",
      source: "data/energy-routing-plan.json",
      status: "policy_fixture",
      unit: "plan_id",
      value: plan.plan_id,
      confidence: 1
    },
    {
      field: "pv_forecast",
      source: "data/forecasts-24h.json",
      status: "forecast",
      unit: "kWh",
      value: fixtures.forecast.summary?.pv_generation_forecast_total_kwh,
      confidence: forecastConfidence
    },
    {
      field: "household_load_forecast",
      source: "data/forecasts-24h.json",
      status: "forecast",
      unit: "kWh",
      value: fixtures.forecast.summary?.household_load_forecast_total_kwh_excluding_ev,
      confidence: forecastConfidence
    },
    {
      field: "battery_reservation",
      source: "data/forecasts-24h.json",
      status: "forecast_battery_reservation",
      unit: "kWh",
      value: round(sumBy(fixtures.forecast.hours, null, "battery_charge_reserved_kwh"), 3),
      confidence: forecastConfidence
    },
    {
      field: "ev_required_energy",
      source: "data/device-state.json",
      status: "mock_actual",
      unit: "kWh",
      value: fixtures.deviceState.ev.required_energy_kwh,
      confidence: 0.9
    },
    {
      field: "ev_departure_deadline",
      source: "data/device-state.json",
      status: "mock_actual",
      unit: "ISO8601",
      value: fixtures.deviceState.ev.departure_deadline,
      confidence: 0.9
    },
    {
      field: "ev_usable_solar_surplus",
      source: "data/forecasts-24h.json",
      status: "forecast",
      unit: "kWh",
      value: round(solarSurplusKwh, 3),
      confidence: forecastConfidence
    },
    {
      field: "final_import_price",
      source: "data/tariff-contract.json",
      status: "contract_final_customer_price",
      unit: "EUR/kWh",
      value: fixtures.contract.price_rules.current_import_price_eur_per_kwh,
      confidence: 0.94
    },
    {
      field: "feed_in_credit",
      source: "data/tariff-contract.json",
      status: "contract_feed_in_credit",
      unit: "EUR/kWh",
      value: fixtures.contract.price_rules.feed_in_credit_eur_per_kwh,
      confidence: 0.94
    }
  ];
}

function makeCalculationMetadata(fixtures, plan, sourceQuality) {
  return {
    calculated_at: fixtures.forecast.generated_at || fixtures.deviceState.observed_at,
    valid_until: fixtures.forecast.horizon?.end || fixtures.deviceState.ev.departure_deadline,
    input_snapshot_id: [
      fixtures.household?.household_id || fixtures.forecast.household_id,
      fixtures.deviceState.observed_at,
      fixtures.forecast.forecast_id,
      plan.plan_id
    ].filter(Boolean).join(":"),
    routing_version: ROUTING_VERSION,
    routing_mode: plan.routing_mode,
    plan_id: plan.plan_id,
    timezone: fixtures.household?.timezone || fixtures.forecast.timezone || "Europe/Berlin",
    source_quality: sourceQuality
  };
}

function buildAuditSteps(summary, opportunityCost, deadlineNotes) {
  return [
    {
      step: "route_solar",
      formula: "pv_generation -> household_load -> battery -> ev_charging -> grid_export",
      result: `${summary.solar_used_kwh.toFixed(1)} kWh used, ${summary.solar_stored_kwh.toFixed(1)} kWh stored, ${summary.solar_sold_kwh.toFixed(1)} kWh sold`
    },
    {
      step: "route_grid",
      formula: "uncovered household load + remaining EV target before deadline",
      result: `${summary.grid_bought_kwh.toFixed(1)} kWh bought from the grid`
    },
    {
      step: "opportunity_cost",
      formula: "solar used_or_stored kWh x feed_in_credit_eur_per_kwh",
      result_eur: opportunityCost.total_eur
    },
    {
      step: "deadline_check",
      formula: "planned_ev_energy_kwh >= required_ev_energy_kwh and latest_allocation_end <= departure_deadline",
      result: deadlineNotes[0].deadline_met ? "deadline_met" : "deadline_missed"
    }
  ];
}

function calculateEnergyRouting(fixtures, options = {}) {
  validateFixtures(fixtures);
  const plan = resolveRoutingPlan(options);
  const route_allocations = calculateRouteAllocations(fixtures, { routingPlan: plan });
  const summary = summarizeRouteAllocations(route_allocations);
  const opportunity_cost = buildOpportunityCost(route_allocations, fixtures, summary);
  const deadline_notes = buildDeadlineNotes(fixtures, route_allocations);
  const source_quality = buildRoutingSourceQuality(fixtures, plan);
  const calculation = makeCalculationMetadata(fixtures, plan, source_quality);

  return {
    schema_version: "0.1.0",
    routing_id: [
      "route",
      fixtures.household?.household_id || fixtures.forecast.household_id,
      fixtures.forecast.forecast_id,
      plan.plan_id
    ].filter(Boolean).join(":"),
    household_id: fixtures.household?.household_id || fixtures.forecast.household_id,
    created_at: calculation.calculated_at,
    horizon: {
      start: fixtures.forecast.horizon?.start,
      end: fixtures.forecast.horizon?.end,
      granularity: fixtures.forecast.granularity,
      timezone: calculation.timezone
    },
    calculation,
    decision: {
      title: "Route solar first, sell leftovers, and buy low-price grid energy for the EV deadline",
      recommended_action: "apply_energy_routing_plan",
      control_mode: plan.control_mode || "advice_only",
      deadline_met: deadline_notes.every((note) => note.deadline_met),
      confidence: round(Math.min(
        averageForecastConfidence(fixtures),
        fixtures.recommendationFixture?.decision?.confidence || 0.78
      ), 2)
    },
    route_allocations,
    summary,
    opportunity_cost,
    deadline_notes,
    source_quality,
    trust: {
      source_of_truth: source_quality,
      limitations: plan.trust_policy?.limitations || []
    },
    audit_steps: buildAuditSteps(summary, opportunity_cost, deadline_notes)
  };
}

module.exports = {
  ROUTING_VERSION,
  loadEnergyRoutingPlan,
  calculateEnergyRouting,
  calculateRouteAllocations,
  summarizeRouteAllocations,
  buildRoutingSourceQuality
};
