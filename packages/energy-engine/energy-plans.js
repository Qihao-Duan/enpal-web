const fs = require("fs");
const path = require("path");
const { calculateEvRecommendation, makeCalculationMetadata, round } = require("./energy-calculations");
const { calculateEnergyRouting, loadEnergyRoutingPlan } = require("./energy-routing");
const { buildProductUsageProfile, parseContractText } = require("./connectors");
const { listHomeDevices } = require("./home-device-store");

const PLAN_VERSION = "energy-plan.v0.1.0";
const MUNICH_FACTORY_PROFILE_PATH = path.join("fixtures", "companion-demo", "munich-factory-profile.json");

function normalizePlanTier(value) {
  const tier = String(value || "premium").trim().toLowerCase();
  return tier === "basic" ? "basic" : "premium";
}

function isoNow(fixtures) {
  return fixtures.forecast?.generated_at || fixtures.deviceState?.observed_at || new Date().toISOString();
}

function sourceQualityStatus(items = []) {
  if (!Array.isArray(items) || !items.length) return "missing";
  if (items.some((item) => String(item.status || "").includes("missing"))) return "incomplete";
  if (items.some((item) => String(item.status || "").includes("forecast"))) return "mixed_forecast";
  return "confirmed_or_fixture";
}

function loadMunichFactoryProfile(rootDir = process.cwd()) {
  const filePath = path.join(rootDir, MUNICH_FACTORY_PROFILE_PATH);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function isFactoryDemoRequest(request = {}) {
  const marker = [
    request.profile_key,
    request.profile_id,
    request.scenario,
    request.site_id,
    request.site_type,
    request.business_context?.site_type
  ].filter(Boolean).join(" ").toLowerCase();
  return /\b(factory|industrial|munich)\b/.test(marker);
}

function sumFactoryPremiumComponents(factoryProfile) {
  const components = factoryProfile.result_summary?.premium?.profit_components || [];
  return round(components.reduce((sum, item) => sum + Number(item.daily_value_eur || 0), 0), 2);
}

function buildFactoryDemoOptimization(rootDir, request = {}) {
  const factoryProfile = request.factory_profile || loadMunichFactoryProfile(rootDir);
  const basic = factoryProfile.result_summary.basic;
  const premium = factoryProfile.result_summary.premium;
  const dailyPremiumValue = round(Number(premium.daily_profit_impact_eur || sumFactoryPremiumComponents(factoryProfile)), 2);
  const monthlyPremiumValue = round(Number(premium.monthly_profit_impact_eur || dailyPremiumValue * factoryProfile.factory.working_days_per_month), 2);
  const basicDailyValue = round(Number(basic.daily_profit_impact_eur || 0), 2);
  const basicMonthlyValue = round(Number(basic.monthly_profit_impact_eur || 0), 2);
  const monthlyLift = round(monthlyPremiumValue - basicMonthlyValue, 2);
  const sourceQuality = (factoryProfile.trust_source_quality?.sources || []).map((source) => ({
    field: source.name,
    source: source.source_type,
    status: source.status,
    confidence: source.confidence
  }));

  return {
    schema_version: "0.1.0",
    plan_version: `${PLAN_VERSION}.factory-demo`,
    plan_id: `plan_factory_premium_${factoryProfile.profile_id}`,
    plan_tier: "premium",
    created_at: factoryProfile.created_at,
    site_context: {
      site_id: factoryProfile.profile_id,
      site_type: "factory_demo",
      city: factoryProfile.factory.city,
      display_name: factoryProfile.factory.display_name,
      facility_type: factoryProfile.factory.site_type,
      demo_scope: factoryProfile.industrial_profile_metadata.demo_role,
      claim_boundary: "Synthetic estimated energy value; not measured production profit."
    },
    decision: {
      title: "Shift factory demand into profitable energy windows",
      headline: "Premium turns factory energy flexibility into estimated operating value.",
      plain_english: factoryProfile.industrial_profile_metadata.narrative,
      recommended_action: "review_factory_premium_route",
      control_mode: "advice_only",
      confidence: factoryProfile.trust_source_quality.confidence_score
    },
    baseline_plan: {
      type: "basic_forklift_charging",
      description: basic.optimized_scope,
      energy_kwh: basic.energy_shifted_kwh,
      cash_value_eur: basicDailyValue,
      formula: basic.formula
    },
    optimized_plan: {
      type: "factory_energy_value_route",
      description: premium.optimized_scope,
      cash_value_eur: dailyPremiumValue,
      monthly_value_eur: monthlyPremiumValue,
      formula: premium.formula
    },
    factory_equipment: factoryProfile.factory_equipment,
    flexible_industrial_loads: factoryProfile.flexible_industrial_loads,
    summary: {
      basic_demo_value_eur: basicDailyValue,
      basic_monthly_demo_value_eur: basicMonthlyValue,
      premium_demo_value_eur: dailyPremiumValue,
      premium_monthly_demo_value_eur: monthlyPremiumValue,
      premium_lift_vs_basic_eur: monthlyLift,
      premium_to_basic_multiple: premium.premium_to_basic_multiple,
      flexible_energy_kwh: factoryProfile.flexible_industrial_loads.total_flexible_energy_kwh,
      pv_generation_kwh: factoryProfile.pv_generation.forecast_day_generation_kwh,
      exported_surplus_kwh: factoryProfile.feed_in_export_value.premium_exported_surplus_kwh
    },
    business_case: {
      label: "Estimated factory energy value",
      daily_value_eur: dailyPremiumValue,
      monthly_value_eur: monthlyPremiumValue,
      lift_vs_basic_monthly_eur: monthlyLift,
      component_values: premium.profit_components,
      boundary: "Demo operating-cost impact from synthetic energy routing, not audited profit."
    },
    source_quality: sourceQuality,
    audit: {
      calculated_at: factoryProfile.created_at,
      input_snapshot_id: factoryProfile.profile_id,
      formula_version: "factory-margin-v0.1",
      source_quality: sourceQuality,
      audit_steps: premium.profit_components.map((component) => ({
        step: component.component,
        formula: component.formula,
        result: `EUR ${Number(component.daily_value_eur).toFixed(2)} daily estimated value`
      })),
      limitations: factoryProfile.trust_source_quality.limitations
    },
    algorithm_outputs: {
      headline_metrics: {
        basic_demo_value_eur: basicDailyValue,
        premium_demo_value_eur: dailyPremiumValue,
        premium_monthly_demo_value_eur: monthlyPremiumValue,
        premium_lift_vs_basic_eur: monthlyLift,
        value_multiple: premium.premium_to_basic_multiple
      },
      components: premium.profit_components,
      flexible_loads: factoryProfile.flexible_industrial_loads.loads
    },
    limitations: [
      "Factory values are synthetic demo estimates and are not measured profit.",
      "Advice-only schedule; no live device control is performed.",
      ...factoryProfile.trust_source_quality.limitations
    ],
    plan_access: makePlanAccess("premium")
  };
}

function makePlanAccess(planTier) {
  const premium = planTier === "premium";
  return {
    plan_tier: planTier,
    features: {
      ev_smart_charging: {
        status: "available",
        label: "EV smart charging",
        description: "Optimize charging time against final customer tariff and departure deadline."
      },
      manual_contract_parser: {
        status: "available",
        label: "Manual contract parser",
        description: "Paste tariff text and confirm extracted price terms."
      },
      product_profile: {
        status: "available",
        label: "Device profile builder",
        description: "Estimate flexible appliance impact after user confirmation."
      },
      solar_export_optimizer: {
        status: premium ? "available" : "locked",
        label: "Solar use / store / sell optimizer",
        description: "Route PV between home load, EV charging, battery reserve, export, and low-price grid buys."
      },
      connector_refresh: {
        status: premium ? "available" : "limited",
        label: "Automatic connector refresh",
        description: premium
          ? "Refresh smart meter, tariff, PV, wallbox, and product lookup adapters."
          : "Preview connector readiness; upgrade for automatic refresh and deeper history."
      },
      contract_ocr: {
        status: premium ? "available" : "locked",
        label: "Contract OCR",
        description: "Upload a contract or bill and confirm extracted price terms before they become source of truth."
      }
    },
    upgrade_reason: premium
      ? null
      : "Premium adds solar export planning, connector refresh, OCR, and multi-device routing."
  };
}

function buildConstraints(fixtures, recommendation, routing) {
  const deadlineNote = routing?.deadline_notes?.[0];
  return [
    {
      id: "ev_deadline",
      label: "EV departure",
      status: deadlineNote?.deadline_met === false ? "at_risk" : "satisfied",
      value: fixtures.deviceState.ev.departure_deadline,
      explanation: deadlineNote?.note || "The EV target must be met before departure."
    },
    {
      id: "wallbox_power",
      label: "Wallbox power",
      status: "satisfied",
      value: `${fixtures.deviceState.wallbox.minimum_stable_power_kw}–${fixtures.deviceState.wallbox.max_power_kw} kW`,
      explanation: "Charging slices must respect minimum stable power and maximum wallbox power."
    },
    {
      id: "battery_reserve",
      label: "Battery reserve",
      status: "satisfied",
      value: `${fixtures.deviceState.battery.soc_percent}% charge`,
      explanation: "Stored solar is protected for evening demand unless EV surplus is available."
    },
    {
      id: "source_quality",
      label: "Source quality",
      status: sourceQualityStatus(recommendation.calculation.source_quality),
      value: `${recommendation.calculation.source_quality.length} source signals`,
      explanation: "Savings-bearing claims require tariff, EV state, solar forecast, and low-price window sources."
    }
  ];
}

function routeCounterfactual(allocation, fixtures) {
  if (allocation.action === "sell") {
    return `If this ${allocation.energy_kwh} kWh were used locally instead, it would avoid import only if a matching load existed in the same interval.`;
  }
  if (allocation.source === "solar") {
    return `Selling this solar instead would earn ${round(allocation.energy_kwh * fixtures.contract.price_rules.feed_in_credit_eur_per_kwh, 2)} EUR feed-in credit.`;
  }
  if (allocation.source === "grid") {
    return "The optimizer buys grid energy here only after cheaper solar or reserve options are unavailable for the same constraint.";
  }
  return "Compared with the next-best route, this allocation best satisfies cost, comfort, and deadline constraints.";
}

function enrichRouteAllocations(allocations, fixtures) {
  return (allocations || []).map((allocation) => {
    const importPrice = Number(allocation.price_eur_per_kwh || 0);
    const feedInPrice = Number(fixtures.contract.price_rules.feed_in_credit_eur_per_kwh || 0);
    const marginalValue = allocation.action === "sell"
      ? feedInPrice
      : allocation.source === "solar"
        ? Math.max(0, importPrice - feedInPrice)
        : -importPrice;

    return {
      ...allocation,
      marginal_value_eur_per_kwh: round(marginalValue, 3),
      constraint_binding: [
        allocation.target === "ev_charging" ? "ev_deadline" : null,
        allocation.target === "battery" ? "battery_reserve" : null,
        allocation.source === "grid" ? "final_customer_tariff" : null,
        allocation.source === "solar" ? "feed_in_opportunity_cost" : null
      ].filter(Boolean),
      counterfactual: routeCounterfactual(allocation, fixtures)
    };
  });
}

function buildBasicRouteAllocations(recommendation, fixtures) {
  const importPrice = fixtures.contract.price_rules.current_import_price_eur_per_kwh;
  const feedInPrice = fixtures.contract.price_rules.feed_in_credit_eur_per_kwh;
  return enrichRouteAllocations((recommendation.smart_plan.schedule || []).map((entry) => ({
    interval_start: entry.start,
    interval_end: entry.end,
    action: entry.source === "solar_surplus" ? "use" : "buy",
    source: entry.source === "solar_surplus" ? "solar" : "grid",
    target: "ev_charging",
    energy_kwh: entry.energy_kwh,
    price_eur_per_kwh: entry.cash_price_eur_per_kwh,
    cash_cost_eur: entry.source === "solar_surplus" ? 0 : round(entry.energy_kwh * entry.cash_price_eur_per_kwh, 3),
    export_credit_eur: 0,
    opportunity_cost_eur: entry.source === "solar_surplus" ? round(entry.energy_kwh * feedInPrice, 3) : 0,
    avoided_import_cost_eur: entry.source === "solar_surplus" ? round(entry.energy_kwh * importPrice, 3) : 0,
    source_status: entry.source === "solar_surplus" ? "forecast_ev_usable_solar_surplus" : "deterministic_lowest_price_before_deadline",
    source_file: entry.source === "solar_surplus" ? "data/forecasts-24h.json" : "data/tariff-contract.json",
    confidence: recommendation.decision.confidence,
    reason: entry.source === "solar_surplus"
      ? "Use forecast solar surplus for EV charging before buying grid energy."
      : "Buy grid electricity during the lowest final customer price window before departure.",
    deadline_note: "Counts toward the EV charging target before departure."
  })), fixtures);
}

function calculateOptimizationPlan(fixtures, request = {}, options = {}) {
  if (isFactoryDemoRequest(request)) {
    return buildFactoryDemoOptimization(options.rootDir || process.cwd(), request);
  }

  const planTier = normalizePlanTier(request.plan_tier || request.tier);
  const evRequest = request.ev_request || {};
  const recommendation = calculateEvRecommendation(fixtures, evRequest);
  const routingPlan = options.routingPlan || loadEnergyRoutingPlan(options.rootDir);
  const applianceTelemetry = options.applianceTelemetry || null;
  const premiumRouting = calculateEnergyRouting(fixtures, { routingPlan, applianceTelemetry });
  const routing = planTier === "premium" ? premiumRouting : null;
  const metadata = makeCalculationMetadata(fixtures, {
    plan_version: PLAN_VERSION,
    plan_tier: planTier,
    optimizer_mode: planTier === "premium" ? "solar_use_store_sell_buy" : "ev_smart_charging"
  });
  const routeAllocations = planTier === "premium"
    ? enrichRouteAllocations(premiumRouting.route_allocations, fixtures)
    : buildBasicRouteAllocations(recommendation, fixtures);
  const sourceQuality = planTier === "premium"
    ? premiumRouting.source_quality
    : recommendation.calculation.source_quality;
  const constraints = buildConstraints(fixtures, recommendation, premiumRouting);

  return {
    schema_version: "0.1.0",
    plan_version: PLAN_VERSION,
    plan_id: `plan_${planTier}_${fixtures.household.household_id}_${fixtures.forecast.forecast_id}`,
    plan_tier: planTier,
    created_at: isoNow(fixtures),
    calculation: {
      ...metadata,
      source_quality: sourceQuality,
      routing_version: planTier === "premium" ? premiumRouting.calculation.routing_version : undefined
    },
    recommendation,
    energy_routing: planTier === "premium" ? premiumRouting : {
      decision: {
        title: "EV smart charging only",
        control_mode: "advice_only",
        deadline_met: premiumRouting.decision.deadline_met,
        confidence: recommendation.decision.confidence
      },
      route_allocations: routeAllocations,
      summary: {
        use_kwh: recommendation.smart_plan.solar_surplus_used_kwh,
        store_kwh: 0,
        sell_kwh: 0,
        buy_kwh: recommendation.smart_plan.low_price_grid_energy_kwh,
        ev_energy_routed_kwh: recommendation.ev_request.required_energy_kwh,
        cash_cost_eur: recommendation.smart_plan.cash_cost_eur,
        opportunity_cost_eur: recommendation.smart_plan.solar_opportunity_cost_eur,
        economic_cost_eur: recommendation.smart_plan.economic_cost_including_solar_opportunity_eur
      },
      source_quality: sourceQuality,
      audit_steps: [],
      trust: recommendation.trust
    },
    decision: {
      title: planTier === "premium"
        ? "Route solar, battery, export, and EV charging before prices move"
        : "Delay EV charging into solar and the low-price grid window",
      headline: "Every kWh, routed to its best use.",
      plain_english: planTier === "premium"
        ? "Use rooftop solar for home and EV needs first, keep enough battery reserve for evening demand, sell only true leftovers, then buy low-price grid power before the EV deadline."
        : recommendation.decision.plain_english,
      recommended_action: planTier === "premium" ? "review_premium_energy_route" : recommendation.decision.recommended_action,
      control_mode: "advice_only",
      deadline_met: premiumRouting.decision.deadline_met,
      confidence: planTier === "premium" ? premiumRouting.decision.confidence : recommendation.decision.confidence
    },
    baseline_plan: {
      type: "normal_habit",
      description: recommendation.naive_plan.description,
      energy_kwh: recommendation.naive_plan.energy_kwh,
      cash_cost_eur: recommendation.naive_plan.cash_cost_eur,
      formula: recommendation.naive_plan.formula
    },
    optimized_plan: {
      type: planTier === "premium" ? "whole_home_route" : "ev_smart_charge",
      description: planTier === "premium"
        ? "Minimize final customer cost while protecting comfort, battery reserve, and departure deadlines."
        : recommendation.smart_plan.description,
      cash_cost_eur: recommendation.smart_plan.cash_cost_eur,
      economic_cost_eur: recommendation.smart_plan.economic_cost_including_solar_opportunity_eur,
      finish_by: premiumRouting.deadline_notes?.[0]?.final_allocation_end || recommendation.ev_request.departure_deadline,
      formula: recommendation.smart_plan.formula
    },
    schedule: recommendation.smart_plan.schedule,
    route_allocations: routeAllocations,
    summary: {
      ev_required_energy_kwh: recommendation.ev_request.required_energy_kwh,
      solar_to_ev_kwh: recommendation.smart_plan.solar_surplus_used_kwh,
      low_price_grid_to_ev_kwh: recommendation.smart_plan.low_price_grid_energy_kwh,
      normal_cost_eur: recommendation.naive_plan.cash_cost_eur,
      optimized_cash_cost_eur: recommendation.smart_plan.cash_cost_eur,
      cash_savings_eur: recommendation.savings.cash_savings_eur,
      cash_savings_percent: recommendation.savings.cash_savings_percent,
      route_summary: planTier === "premium" ? premiumRouting.summary : {
        use_kwh: recommendation.smart_plan.solar_surplus_used_kwh,
        store_kwh: 0,
        sell_kwh: 0,
        buy_kwh: recommendation.smart_plan.low_price_grid_energy_kwh
      }
    },
    constraints,
    savings: recommendation.savings,
    opportunity_cost: planTier === "premium"
      ? premiumRouting.opportunity_cost
      : {
          basis: "missed_feed_in_credit",
          feed_in_credit_eur_per_kwh: fixtures.contract.price_rules.feed_in_credit_eur_per_kwh,
          total_eur: recommendation.smart_plan.solar_opportunity_cost_eur,
          note: "Solar has zero cash cost in the prototype, but the economic view includes missed feed-in credit."
        },
    source_quality: sourceQuality,
    audit_steps: [
      ...recommendation.audit_steps,
      ...(planTier === "premium" ? premiumRouting.audit_steps : [])
    ],
    audit: {
      calculated_at: metadata.calculated_at,
      valid_until: metadata.valid_until,
      input_snapshot_id: metadata.input_snapshot_id,
      formula_version: metadata.formula_version,
      routing_version: planTier === "premium" ? premiumRouting.calculation.routing_version : null,
      source_quality: sourceQuality,
      audit_steps: [
        ...recommendation.audit_steps,
        ...(planTier === "premium" ? premiumRouting.audit_steps : [])
      ],
      limitations: [
        ...(recommendation.trust?.limitations || []),
        ...(planTier === "premium" ? premiumRouting.trust?.limitations || [] : [])
      ]
    },
    algorithm_outputs: {
      headline_metrics: {
        normal_cost_eur: recommendation.naive_plan.cash_cost_eur,
        smart_cost_eur: recommendation.smart_plan.cash_cost_eur,
        saving_eur: recommendation.savings.cash_savings_eur,
        ready_by: premiumRouting.deadline_notes?.[0]?.final_allocation_end || recommendation.ev_request.departure_deadline
      },
      schedule: recommendation.smart_plan.schedule,
      routes: routeAllocations,
      constraints
    },
    limitations: [
      "All values are synthetic demo data unless a connector response says otherwise.",
      "The assistant explains backend calculations; it does not invent prices, savings, or device states.",
      "Advice-only schedule; no live device control is performed."
    ],
    plan_access: makePlanAccess(planTier)
  };
}

function getCurrentPlan(fixtures) {
  return {
    schema_version: "0.1.0",
    current_plan_tier: "premium",
    household_id: fixtures.household.household_id,
    updated_at: isoNow(fixtures),
    tiers: {
      basic: makePlanAccess("basic"),
      premium: makePlanAccess("premium")
    }
  };
}

function buildProfileCurrent(fixtures, overrides = {}) {
  const household = fixtures.household || {};
  const ev = fixtures.deviceState.ev || {};
  const battery = fixtures.deviceState.battery || {};
  return {
    schema_version: "0.1.0",
    profile_id: household.household_id || "household_profile",
    status: Object.keys(overrides).length ? "user_confirmed_mock" : "fixture_profile",
    household: {
      ...household,
      ...overrides.household
    },
    devices: {
      has_pv: true,
      has_battery: true,
      has_ev: true,
      has_wallbox: true,
      battery_soc_percent: battery.soc_percent,
      ev_departure_deadline: ev.departure_deadline,
      ...(overrides.devices || {})
    },
    preferences: {
      priority: "save_money_with_comfort_guardrails",
      ev_deadline_buffer_minutes: 60,
      appliance_confirmation_required: true,
      automation_mode: "advice_only",
      ...(overrides.preferences || {})
    },
    source_quality: [
      {
        field: "household_profile",
        source: "data/household-profile.json",
        status: "fixture_profile",
        confidence: 0.72
      },
      {
        field: "device_state",
        source: "data/device-state.json",
        status: "mock_actual",
        confidence: 0.9
      }
    ]
  };
}

function buildProfileReadiness(fixtures, registry) {
  const devices = registry || listHomeDevices(process.cwd(), fixtures);
  const checks = [
    {
      id: "contract_terms",
      label: "Contract terms",
      status: fixtures.contract?.price_rules ? "ready" : "missing",
      source: "data/tariff-contract.json"
    },
    {
      id: "ev_state",
      label: "EV and wallbox state",
      status: fixtures.deviceState?.ev && fixtures.deviceState?.wallbox ? "ready" : "missing",
      source: "data/device-state.json"
    },
    {
      id: "solar_forecast",
      label: "PV forecast",
      status: fixtures.forecast?.hours?.length ? "forecast" : "missing",
      source: "data/forecasts-24h.json"
    },
    {
      id: "home_devices",
      label: "Home devices",
      status: devices.device_count > 0 ? "ready" : "estimated",
      source: devices.storage?.path || "system profile"
    },
    {
      id: "user_confirmation",
      label: "User confirmation",
      status: "needs_confirmation",
      source: "profile setup"
    }
  ];
  const readyWeight = checks.reduce((score, item) => {
    if (item.status === "ready") return score + 1;
    if (item.status === "forecast" || item.status === "estimated") return score + 0.75;
    return score;
  }, 0);

  return {
    schema_version: "0.1.0",
    household_id: fixtures.household.household_id,
    status: "estimated_ready_for_demo",
    readiness_percent: round((readyWeight / checks.length) * 100, 0),
    checks,
    next_best_action: "Confirm contract terms and device models before allowing automated control."
  };
}

function scanProduct(fixtures, request = {}) {
  const scanText = [
    request.ocr_text,
    request.label_text,
    request.text,
    request.query
  ].filter(Boolean).join(" ");
  const profile = buildProductUsageProfile(fixtures, {
    ...request,
    query: request.query || scanText,
    photo_ocr_text: scanText
  });
  return {
    schema_version: "0.1.0",
    scan_id: `scan_${Date.now()}`,
    status: "terms_extracted_from_text_demo",
    intake_mode: request.image ? "image_upload_demo" : "text_or_ocr_demo",
    profile,
    next_best_action: "Ask the user to confirm the exact product before using it in optimization."
  };
}

function buildDeviceReadiness(device) {
  if (!device) {
    return {
      status: "not_found",
      ready_for_schedule: false,
      next_best_action: "Add or confirm this device before planning."
    };
  }
  const needsConfirmation = Boolean(device.user_confirmation_required) || /confirm/i.test(device.data_quality || "");
  const hasEnergy = device.energy_profile?.cycle_kwh !== null || device.energy_profile?.power_kw !== null || device.energy_profile?.display;
  return {
    device_id: device.device_id,
    status: !hasEnergy ? "needs_energy_confirmation" : needsConfirmation ? "needs_user_confirmation" : "ready_for_schedule",
    ready_for_schedule: Boolean(hasEnergy && !needsConfirmation),
    flexible_load: Boolean(device.flexible_load),
    source_quality: device.source_quality || [],
    next_best_action: !hasEnergy
      ? "Add kWh per run, rated power, or a meter reading."
      : needsConfirmation
        ? "Ask the user to confirm this model and energy estimate."
        : "Use this device in the next optimization run."
  };
}

function findDevice(registry, deviceId) {
  return (registry.devices || []).find((device) => device.device_id === deviceId || device.model === deviceId);
}

function buildContractUpload(fixtures, request = {}) {
  const text = request.text || request.ocr_text || request.contract_text || "";
  const parsed = parseContractText(fixtures, { text });
  return {
    schema_version: "0.1.0",
    contract_id: `contract_demo_${fixtures.household.household_id}`,
    status: "terms_extracted",
    intake_mode: request.file_name ? "upload_demo" : "text_demo",
    file_name: request.file_name || null,
    ocr: {
      status: "simulated_from_text",
      text_excerpt: text.slice(0, 220)
    },
    parsed_terms: parsed.extracted_terms,
    field_confidence: parsed.source_quality,
    needs_user_confirmation: true,
    next_best_action: "Confirm field-level tariff terms before they become source of truth."
  };
}

function confirmContract(fixtures, contractId, request = {}) {
  const parsedTerms = request.parsed_terms || request.extracted_terms || fixtures.contract.price_rules;
  return {
    schema_version: "0.1.0",
    contract_id: contractId,
    status: "confirmed_source_of_truth_demo",
    confirmed_at: isoNow(fixtures),
    confirmed_terms: parsedTerms,
    source_quality: [{
      field: "confirmed_contract_terms",
      source: contractId,
      status: "user_confirmed_mock",
      unit: "tariff_terms",
      value: Object.keys(parsedTerms || {}).length,
      confidence: 0.96
    }]
  };
}

module.exports = {
  PLAN_VERSION,
  buildContractUpload,
  buildDeviceReadiness,
  buildFactoryDemoOptimization,
  buildProfileCurrent,
  buildProfileReadiness,
  calculateOptimizationPlan,
  confirmContract,
  findDevice,
  getCurrentPlan,
  loadMunichFactoryProfile,
  makePlanAccess,
  normalizePlanTier,
  scanProduct
};
