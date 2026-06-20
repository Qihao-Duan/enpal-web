const FORMULA_VERSION = "energy-engine.v0.1.0";

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function requirePositiveNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive number.`), { statusCode: 400 });
  }
  return number;
}

function intervalHoursFromGranularity(granularity) {
  if (granularity === "PT15M") return 0.25;
  if (granularity === "PT30M") return 0.5;
  return 1;
}

function makeCalculationMetadata(fixtures, extra = {}) {
  const householdId = fixtures.household.household_id;
  const calculatedAt = fixtures.forecast.generated_at || fixtures.deviceState.observed_at;
  const validUntil = fixtures.forecast.horizon?.end || fixtures.deviceState.ev?.departure_deadline;
  return {
    calculated_at: calculatedAt,
    valid_until: validUntil,
    input_snapshot_id: [
      householdId,
      fixtures.deviceState.observed_at,
      fixtures.forecast.forecast_id
    ].filter(Boolean).join(":"),
    formula_version: FORMULA_VERSION,
    timezone: fixtures.household.timezone || "Europe/Berlin",
    source_quality: buildSourceQuality(fixtures),
    ...extra
  };
}

function buildSourceQuality(fixtures) {
  return [
    {
      field: "contract_price",
      source: "data/tariff-contract.json",
      status: "user_confirmed_mock",
      unit: "EUR/kWh",
      value: fixtures.contract.price_rules.current_import_price_eur_per_kwh,
      confidence: 0.94
    },
    {
      field: "ev_need",
      source: "data/device-state.json",
      status: "mock_actual",
      unit: "kWh",
      value: fixtures.deviceState.ev.required_energy_kwh,
      confidence: 0.9
    },
    {
      field: "solar_surplus",
      source: "data/forecasts-24h.json",
      status: "forecast",
      unit: "kWh",
      value: fixtures.forecast.summary.ev_usable_solar_surplus_kwh,
      confidence: 0.78
    },
    {
      field: "low_price_window",
      source: "data/tariff-contract.json",
      status: "tariff_fixture",
      unit: "EUR/kWh",
      value: fixtures.contract.ev_charging_demo_terms.low_price_window.final_import_price_eur_per_kwh,
      confidence: 0.88
    }
  ];
}

function calculatePowerIntervals(fixtures) {
  const intervalHours = intervalHoursFromGranularity(fixtures.forecast.granularity);
  return fixtures.forecast.hours.map((hour) => {
    const householdLoadKwh = hour.household_load_forecast_kwh_excluding_ev;
    const pvKwh = hour.pv_generation_forecast_kwh;
    const reservedBatteryKwh = hour.battery_charge_reserved_kwh;
    const usableSolarKwh = hour.ev_usable_solar_surplus_kwh;
    const netAfterPvKwh = householdLoadKwh + reservedBatteryKwh - pvKwh;
    const importKwh = round(Math.max(0, netAfterPvKwh), 3);
    const exportKwh = round(Math.max(0, -netAfterPvKwh - usableSolarKwh), 3);

    return {
      interval_start: hour.hour_start,
      interval_hours: intervalHours,
      pv_generation_kwh: pvKwh,
      household_load_kwh_excluding_ev: householdLoadKwh,
      battery_reserved_kwh: reservedBatteryKwh,
      ev_usable_solar_surplus_kwh: usableSolarKwh,
      estimated_grid_import_kwh_excluding_ev: importKwh,
      estimated_grid_export_kwh_excluding_ev: exportKwh,
      source_status: "forecast",
      confidence: hour.confidence
    };
  });
}

function calculateTariffIntervals(fixtures, powerIntervals = calculatePowerIntervals(fixtures)) {
  const monthlyBaseFee =
    fixtures.contract.price_rules.standing_charge_eur_per_month +
    fixtures.contract.price_rules.metering_fee_eur_per_month;
  const dailyBaseFee = monthlyBaseFee / 30;

  return fixtures.forecast.hours.map((hour, index) => {
    const power = powerIntervals[index];
    const importCost = power.estimated_grid_import_kwh_excluding_ev * hour.grid_import_price_eur_per_kwh;
    const exportCredit = power.estimated_grid_export_kwh_excluding_ev * hour.solar_export_price_eur_per_kwh;
    return {
      interval_start: hour.hour_start,
      final_import_price_eur_per_kwh: hour.grid_import_price_eur_per_kwh,
      export_price_eur_per_kwh: hour.solar_export_price_eur_per_kwh,
      import_cost_eur_excluding_ev: round(importCost),
      export_credit_eur_excluding_ev: round(exportCredit),
      net_cost_eur_excluding_ev: round(importCost - exportCredit),
      source_status: "forecast_final_customer_price"
    };
  }).concat({
    interval_start: fixtures.forecast.horizon.end,
    base_fee_eur_per_day: round(dailyBaseFee),
    source_status: "contract_fixed_fee"
  });
}

function calculateBillForecast(fixtures) {
  const powerIntervals = calculatePowerIntervals(fixtures);
  const tariffIntervals = calculateTariffIntervals(fixtures, powerIntervals);
  const variableCost = tariffIntervals
    .filter((item) => item.net_cost_eur_excluding_ev !== undefined)
    .reduce((sum, item) => sum + item.net_cost_eur_excluding_ev, 0);
  const baseFee = tariffIntervals.find((item) => item.base_fee_eur_per_day)?.base_fee_eur_per_day || 0;
  const importKwh = powerIntervals.reduce((sum, item) => sum + item.estimated_grid_import_kwh_excluding_ev, 0);
  const exportKwh = powerIntervals.reduce((sum, item) => sum + item.estimated_grid_export_kwh_excluding_ev, 0);

  return {
    horizon_start: fixtures.forecast.horizon.start,
    horizon_end: fixtures.forecast.horizon.end,
    import_kwh_excluding_ev: round(importKwh, 3),
    export_kwh_excluding_ev: round(exportKwh, 3),
    variable_cost_eur_excluding_ev: round(variableCost),
    daily_base_fee_eur: baseFee,
    total_cost_eur_excluding_ev: round(variableCost + baseFee),
    projected_monthly_cost_eur_excluding_ev: round((variableCost + baseFee) * 30),
    source_status: "forecast"
  };
}

function buildSolarSchedule(fixtures) {
  const minimumStablePowerKw = fixtures.deviceState.wallbox.minimum_stable_power_kw || 0;
  return fixtures.forecast.hours
    .filter((hour) => hour.ev_usable_solar_surplus_kwh > 0)
    .map((hour) => {
      const start = new Date(hour.hour_start);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const energy = hour.ev_usable_solar_surplus_kwh;
      return {
        start: hour.hour_start,
        end: end.toISOString().replace(".000Z", "Z"),
        source: "solar_surplus",
        energy_kwh: energy,
        cash_price_eur_per_kwh: fixtures.contract.ev_charging_demo_terms.solar_surplus_cash_cost_eur_per_kwh,
        allocation_only: energy < minimumStablePowerKw,
        execution_note: energy < minimumStablePowerKw
          ? "Solar energy allocation is below the wallbox minimum stable power for a standalone one-hour control command; blend with battery/grid support or aggregate before live control."
          : "Solar allocation is above the wallbox minimum stable power."
      };
    });
}

function buildLowPriceSchedule(fixtures, lowPriceGridEnergyKwh) {
  const lowPrice = fixtures.contract.ev_charging_demo_terms.low_price_window.final_import_price_eur_per_kwh;
  const lowHours = fixtures.forecast.hours.filter((hour) => (
    hour.grid_import_price_eur_per_kwh === lowPrice &&
    hour.hour_start >= fixtures.contract.ev_charging_demo_terms.low_price_window.start &&
    hour.hour_start < fixtures.contract.ev_charging_demo_terms.low_price_window.end
  ));
  const maxPerHour = fixtures.deviceState.wallbox.max_power_kw;
  let remaining = lowPriceGridEnergyKwh;

  return lowHours.map((hour) => {
    const energy = round(Math.min(maxPerHour, remaining), 3);
    remaining = round(Math.max(0, remaining - energy), 3);
    const start = new Date(hour.hour_start);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      start: hour.hour_start,
      end: end.toISOString().replace(".000Z", "Z"),
      source: "grid_low_price",
      energy_kwh: energy,
      cash_price_eur_per_kwh: lowPrice
    };
  }).filter((item) => item.energy_kwh > 0);
}

function calculateEvRecommendation(fixtures, overrides = {}) {
  const requiredEnergyKwh = overrides.required_energy_kwh === undefined
    ? fixtures.deviceState.ev.required_energy_kwh
    : requirePositiveNumber(overrides.required_energy_kwh, "required_energy_kwh");
  const departureDeadline = overrides.departure_deadline || fixtures.deviceState.ev.departure_deadline;
  const currentPrice = fixtures.contract.price_rules.current_import_price_eur_per_kwh;
  const lowPrice = fixtures.contract.ev_charging_demo_terms.low_price_window.final_import_price_eur_per_kwh;
  const solarCashPrice = fixtures.contract.ev_charging_demo_terms.solar_surplus_cash_cost_eur_per_kwh;
  const solarOpportunityPrice = fixtures.contract.ev_charging_demo_terms.solar_surplus_opportunity_cost_eur_per_kwh;
  const solarSurplusKwh = round(Math.min(
    requiredEnergyKwh,
    positiveNumber(fixtures.forecast.summary.ev_usable_solar_surplus_kwh, 0)
  ), 3);
  const lowPriceGridEnergyKwh = round(Math.max(0, requiredEnergyKwh - solarSurplusKwh), 3);
  const naiveCost = round(requiredEnergyKwh * currentPrice);
  const smartCashCost = round((solarSurplusKwh * solarCashPrice) + (lowPriceGridEnergyKwh * lowPrice));
  const solarOpportunityCost = round(solarSurplusKwh * solarOpportunityPrice);
  const economicCost = round(smartCashCost + solarOpportunityCost);
  const cashSavings = round(naiveCost - smartCashCost);
  const economicSavings = round(naiveCost - economicCost);
  const solarSchedule = buildSolarSchedule(fixtures);
  const lowPriceSchedule = buildLowPriceSchedule(fixtures, lowPriceGridEnergyKwh);
  const metadata = makeCalculationMetadata(fixtures);

  return {
    recommendation_id: "rec_ev_smart_charge_live_001",
    created_at: metadata.calculated_at,
    calculation: metadata,
    decision: {
      title: "Delay EV charging and use solar plus the low-price window",
      plain_english: "Do not charge the car at full power right now. Wait for solar surplus from 14:00, then finish during the 22:00-01:00 low-price window. The car still reaches 80% before the 08:00 departure.",
      recommended_action: "start_smart_charging",
      control_mode: "advice_only",
      deadline_met: true,
      confidence: 0.78
    },
    ev_request: {
      required_energy_kwh: requiredEnergyKwh,
      departure_deadline: departureDeadline,
      wallbox_max_power_kw: fixtures.deviceState.wallbox.max_power_kw,
      wallbox_minimum_stable_power_kw: fixtures.deviceState.wallbox.minimum_stable_power_kw,
      source_status: "mock_actual"
    },
    naive_plan: {
      description: "Charge immediately at the current final import price.",
      start: fixtures.deviceState.observed_at,
      energy_kwh: requiredEnergyKwh,
      grid_energy_kwh: requiredEnergyKwh,
      solar_energy_kwh: 0,
      price_eur_per_kwh: currentPrice,
      cash_cost_eur: naiveCost,
      formula: `${requiredEnergyKwh.toFixed(1)} kWh x ${currentPrice.toFixed(2)} EUR/kWh = ${naiveCost.toFixed(2)} EUR`
    },
    smart_plan: {
      description: "Use expected solar surplus and low-price grid electricity before the departure deadline.",
      total_energy_kwh: requiredEnergyKwh,
      solar_surplus_used_kwh: solarSurplusKwh,
      low_price_grid_energy_kwh: lowPriceGridEnergyKwh,
      fallback_grid_energy_kwh: 0,
      solar_cash_cost_eur_per_kwh: solarCashPrice,
      solar_opportunity_cost_eur_per_kwh: solarOpportunityPrice,
      low_price_grid_price_eur_per_kwh: lowPrice,
      cash_cost_eur: smartCashCost,
      solar_opportunity_cost_eur: solarOpportunityCost,
      economic_cost_including_solar_opportunity_eur: economicCost,
      schedule: [...solarSchedule, ...lowPriceSchedule],
      formula: `(${solarSurplusKwh.toFixed(1)} kWh x ${solarCashPrice.toFixed(2)} EUR/kWh solar cash cost) + (${lowPriceGridEnergyKwh.toFixed(1)} kWh x ${lowPrice.toFixed(2)} EUR/kWh grid) = ${smartCashCost.toFixed(2)} EUR`,
      execution_note: "This prototype returns an advice-only schedule. Solar slices below wallbox minimum stable power are marked allocation_only for audit."
    },
    savings: {
      cash_savings_eur: cashSavings,
      cash_savings_percent: round((cashSavings / naiveCost) * 100, 1),
      economic_savings_including_solar_opportunity_eur: economicSavings,
      economic_savings_percent: round((economicSavings / naiveCost) * 100, 1),
      headline_metric: "cash_savings_eur",
      display_text: `Smart charging saves ${cashSavings.toFixed(2)} EUR versus charging immediately.`
    },
    trust: {
      source_of_truth: metadata.source_quality,
      limitations: [
        "All current values are synthetic demo data.",
        "Public market prices are not shown as final customer prices unless normalized by the tariff rule.",
        "Advice-only schedule; no live device control is performed."
      ]
    },
    audit_steps: [
      {
        step: "naive_cost",
        formula: "required_energy_kwh x current_import_price_eur_per_kwh",
        result_eur: naiveCost
      },
      {
        step: "smart_cash_cost",
        formula: "solar_kwh x solar_cash_price + low_price_grid_kwh x low_price",
        result_eur: smartCashCost
      },
      {
        step: "cash_savings",
        formula: "naive_cost - smart_cash_cost",
        result_eur: cashSavings
      }
    ]
  };
}

function calculateLiveState(fixtures) {
  const power_intervals = calculatePowerIntervals(fixtures);
  const price_intervals = calculateTariffIntervals(fixtures, power_intervals);
  const bill_forecast = calculateBillForecast(fixtures);
  const calculation = makeCalculationMetadata(fixtures);
  return {
    calculation,
    source_quality: calculation.source_quality,
    power_intervals,
    price_intervals,
    bill_forecast
  };
}

module.exports = {
  FORMULA_VERSION,
  round,
  calculatePowerIntervals,
  calculateTariffIntervals,
  calculateBillForecast,
  calculateEvRecommendation,
  calculateLiveState,
  makeCalculationMetadata
};
