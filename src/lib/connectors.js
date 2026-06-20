const CONNECTOR_VERSION = "retrieval-layer.v0.1.0";

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function compactNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

function makeConnectorStatus(fixtures) {
  const generatedAt = fixtures.forecast.generated_at || fixtures.deviceState.observed_at;
  const householdId = fixtures.household.household_id;

  return {
    retrieval_layer: {
      version: CONNECTOR_VERSION,
      country: "DE",
      household_id: householdId,
      mode: "external_ready_fixture_adapters",
      last_refresh: generatedAt,
      explanation: "The prototype uses deterministic fixture adapters now. Each adapter has the same normalized shape expected from a real provider API once credentials are added."
    },
    connectors: [
      {
        id: "tariff_market",
        name: "Tariff and market price",
        current_mode: "fixture_adapter",
        status: "ready_for_credentials",
        last_observed_at: fixtures.contract.last_parsed_at,
        confidence: 0.94,
        provider_targets: ["Tibber", "ENTSO-E Transparency Platform", "Awattar", "retailer tariff API"],
        auth_required: true,
        output_fields: ["final_import_price_eur_per_kwh", "low_price_window", "standing_charge_eur_per_month"]
      },
      {
        id: "solar_weather",
        name: "Solar and weather forecast",
        current_mode: "fixture_adapter",
        status: "ready_for_location_and_pv_profile",
        last_observed_at: fixtures.forecast.generated_at,
        confidence: 0.78,
        provider_targets: ["inverter portal", "Open-Meteo", "Solcast", "PVGIS"],
        auth_required: false,
        output_fields: ["pv_generation_forecast_kwh", "ev_usable_solar_surplus_kwh", "weather_summary"]
      },
      {
        id: "device_telemetry",
        name: "Home device telemetry",
        current_mode: "fixture_adapter",
        status: "ready_for_oauth_or_local_bridge",
        last_observed_at: fixtures.deviceState.observed_at,
        confidence: 0.9,
        provider_targets: ["wallbox API", "EV cloud API", "inverter/battery API", "smart meter gateway"],
        auth_required: true,
        output_fields: ["ev_required_energy_kwh", "battery_soc_percent", "current_power_flow_kw"]
      },
      {
        id: "contract_parser",
        name: "Contract and tariff parser",
        current_mode: "fixture_plus_rule_parser",
        status: "ready_for_scan_upload",
        last_observed_at: fixtures.contract.last_parsed_at,
        confidence: 0.86,
        provider_targets: ["PDF upload", "camera scan", "email import", "retailer customer portal"],
        auth_required: false,
        output_fields: ["price_rules", "cancellation_notice_days", "metering_requirement"]
      },
      {
        id: "product_lookup",
        name: "Product energy lookup",
        current_mode: "demo_catalog",
        status: "ready_for_barcode_or_model_scan",
        last_observed_at: fixtures.productCatalog.updated_at,
        confidence: 0.68,
        provider_targets: ["EPREL", "manufacturer manuals", "retailer specification pages", "barcode/OCR scan"],
        auth_required: false,
        output_fields: ["category", "model", "energy_profile", "needs_user_confirmation"]
      }
    ]
  };
}

function makeNormalizedSignals(fixtures) {
  const forecastSummary = fixtures.forecast.summary;
  const currentFlow = fixtures.deviceState.current_power_flow_kw;
  const ev = fixtures.deviceState.ev;
  const contract = fixtures.contract;

  return [
    {
      id: "tariff_now",
      label: "Current contract price",
      value: `${contract.price_rules.current_import_price_eur_per_kwh.toFixed(2)} EUR/kWh`,
      normalized_value: contract.price_rules.current_import_price_eur_per_kwh,
      unit: "EUR/kWh",
      source: "data/tariff-contract.json",
      source_status: "fixture_contract",
      confidence: 0.94,
      user_message: "This is the final customer import price, not a raw wholesale market price."
    },
    {
      id: "best_window",
      label: "Best low-price window",
      value: `${forecastSummary.lowest_import_price_eur_per_kwh.toFixed(2)} EUR/kWh from 22:00`,
      normalized_value: forecastSummary.lowest_import_price_eur_per_kwh,
      unit: "EUR/kWh",
      source: "data/forecasts-24h.json",
      source_status: "forecast",
      confidence: 0.88,
      user_message: "The low-price window is normalized from the forecasted final tariff curve."
    },
    {
      id: "solar_surplus",
      label: "EV-ready solar surplus",
      value: `${compactNumber(forecastSummary.ev_usable_solar_surplus_kwh, 1)} kWh`,
      normalized_value: forecastSummary.ev_usable_solar_surplus_kwh,
      unit: "kWh",
      source: "data/forecasts-24h.json",
      source_status: "forecast",
      confidence: 0.78,
      user_message: "Solar surplus remains a forecast and should be refreshed close to the charging window."
    },
    {
      id: "ev_need",
      label: "EV energy needed",
      value: `${compactNumber(ev.required_energy_kwh, 1)} kWh by 08:00`,
      normalized_value: ev.required_energy_kwh,
      unit: "kWh",
      source: "data/device-state.json",
      source_status: "mock_actual",
      confidence: 0.9,
      user_message: "The value comes from vehicle SOC, target SOC, and usable battery capacity."
    },
    {
      id: "power_flow",
      label: "Current home power flow",
      value: `${compactNumber(currentFlow.pv_generation, 1)} kW PV, ${compactNumber(currentFlow.grid_export, 1)} kW export`,
      normalized_value: currentFlow,
      unit: "kW",
      source: "data/device-state.json",
      source_status: "mock_actual",
      confidence: 0.86,
      user_message: "Power is instantaneous; cost calculations still use energy over time in kWh."
    }
  ];
}

function refreshConnectors(fixtures) {
  const status = makeConnectorStatus(fixtures);
  const normalizedSignals = makeNormalizedSignals(fixtures);

  return {
    retrieval_run_id: `retrieval_${fixtures.household.household_id}_${fixtures.forecast.forecast_id}`,
    fetched_at: fixtures.forecast.generated_at,
    mode: "external_ready_fixture_adapters",
    status: "completed",
    connector_version: CONNECTOR_VERSION,
    connectors: status.connectors,
    normalized_signals: normalizedSignals,
    calculation_input_summary: {
      current_price_eur_per_kwh: fixtures.contract.price_rules.current_import_price_eur_per_kwh,
      low_price_eur_per_kwh: fixtures.forecast.summary.lowest_import_price_eur_per_kwh,
      ev_required_energy_kwh: fixtures.deviceState.ev.required_energy_kwh,
      ev_usable_solar_surplus_kwh: fixtures.forecast.summary.ev_usable_solar_surplus_kwh,
      pv_generation_forecast_total_kwh: fixtures.forecast.summary.pv_generation_forecast_total_kwh
    },
    trust_note: "These normalized signals are enough for the backend calculation engine. Real connectors should replace the fixture adapters one by one while preserving this response shape."
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreProduct(entry, query, category) {
  const normalizedQuery = normalizeText(query);
  const haystack = normalizeText([
    entry.brand,
    entry.model,
    entry.category,
    ...(entry.aliases || [])
  ].join(" "));

  if (!normalizedQuery) return 0;
  let score = 0;
  if (haystack.includes(normalizedQuery)) score += 0.65;
  normalizedQuery.split(" ").forEach((token) => {
    if (token && haystack.includes(token)) score += 0.08;
  });
  if (category && entry.category === category) score += 0.12;
  return Math.min(1, score);
}

function lookupProduct(fixtures, request = {}) {
  const query = String(request.query || "").trim();
  const category = request.category ? String(request.category).trim() : "";

  if (!query) {
    throw Object.assign(new Error("query is required for product lookup."), { statusCode: 400 });
  }

  const candidates = fixtures.productCatalog.entries
    .map((entry) => ({
      ...entry,
      match_score: round(scoreProduct(entry, query, category), 2)
    }))
    .filter((entry) => entry.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 3)
    .map((entry) => ({
      product_id: entry.product_id,
      category: entry.category,
      brand: entry.brand,
      model: entry.model,
      match_score: entry.match_score,
      confidence: round((entry.confidence + entry.match_score) / 2, 2),
      energy_profile: entry.energy_profile,
      source: entry.source,
      user_confirmation_required: entry.source.needs_user_confirmation
    }));

  return {
    lookup_id: `lookup_${Date.now()}`,
    query,
    category: category || null,
    source_status: fixtures.productCatalog.source_status,
    match_status: candidates.length ? "candidate_found" : "no_candidate_found",
    candidates,
    next_best_action: candidates.length
      ? "Ask the user to confirm the exact model or scan the energy label before using this value for bill forecasts."
      : "Ask for a photo of the energy label, barcode, or a more exact product model.",
    connector_version: CONNECTOR_VERSION
  };
}

function extractProductHints(text) {
  const value = String(text || "");
  const kwMatch = value.match(/(\d+(?:[.,]\d+)?)\s*kW\b/i);
  const wattMatch = value.match(/(\d+(?:[.,]\d+)?)\s*W\b/i);
  const cycleMatch = value.match(/(\d+(?:[.,]\d+)?)\s*kWh\s*(?:\/|\s*per\s*)?(?:cycle|run|wash|eco)/i);
  const runtimeMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minutes|minute)\b/i);
  const weeklyMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:x|times|cycles|runs)\s*(?:\/|\s*per\s*)?(?:week|wk)/i);

  return {
    power_kw: kwMatch ? parseLocalizedNumber(kwMatch[1]) : (
      wattMatch ? round(parseLocalizedNumber(wattMatch[1]) / 1000, 3) : null
    ),
    cycle_kwh: cycleMatch ? parseLocalizedNumber(cycleMatch[1]) : null,
    runtime_minutes: runtimeMatch ? parseLocalizedNumber(runtimeMatch[1]) : null,
    cycles_per_week: weeklyMatch ? parseLocalizedNumber(weeklyMatch[1]) : null
  };
}

function firstNumber(...values) {
  for (const value of values) {
    const number = parseLocalizedNumber(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function inferCategoryFromText(text, fallback = "") {
  const normalized = normalizeText(text);
  if (fallback) return fallback;
  if (normalized.includes("dish")) return "dishwasher";
  if (normalized.includes("wash")) return "washing_machine";
  if (normalized.includes("dryer")) return "dryer";
  if (normalized.includes("heat pump") || normalized.includes("heizung") || normalized.includes("warmepumpe")) return "heat_pump";
  if (normalized.includes("ev") || normalized.includes("vehicle") || normalized.includes("car")) return "ev";
  if (normalized.includes("fridge") || normalized.includes("freezer")) return "fridge";
  return "unknown";
}

function energyProfileCycleKwh(profile) {
  if (!profile) return null;
  return firstNumber(
    profile.typical_cycle_kwh,
    profile.eco_cycle_kwh,
    profile.recommended_home_charge_kwh
  );
}

function categoryDefaultRuntimeMinutes(category) {
  if (category === "dishwasher") return 150;
  if (category === "washing_machine") return 180;
  if (category === "dryer") return 120;
  if (category === "heat_pump") return 120;
  if (category === "ev") return 180;
  return 60;
}

function formatTimeFromIso(timestamp) {
  const match = String(timestamp || "").match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "the cheapest available window";
}

function cheapestForecastWindow(fixtures) {
  const hours = fixtures.forecast.hours || [];
  const cheapest = hours.reduce((best, hour) => {
    if (!best) return hour;
    return Number(hour.grid_import_price_eur_per_kwh) < Number(best.grid_import_price_eur_per_kwh)
      ? hour
      : best;
  }, null);

  return {
    interval_start: cheapest?.hour_start || fixtures.forecast.horizon?.start,
    interval_end: cheapest ? fixtures.forecast.hours[hours.indexOf(cheapest) + 1]?.hour_start || fixtures.forecast.horizon?.end : fixtures.forecast.horizon?.end,
    price_eur_per_kwh: cheapest?.grid_import_price_eur_per_kwh || fixtures.forecast.summary?.lowest_import_price_eur_per_kwh || fixtures.contract.price_rules.current_import_price_eur_per_kwh,
    source: "data/forecasts-24h.json"
  };
}

function buildProductUsageProfile(fixtures, request = {}) {
  const sourceText = [
    request.query,
    request.model_text,
    request.natural_text,
    request.label_text,
    request.photo_ocr_text,
    request.description
  ].filter(Boolean).join(" ");
  const manual = request.product_details || request.manual_profile || {};
  const category = inferCategoryFromText(sourceText, request.category ? String(request.category).trim() : "");
  const lookup = sourceText.trim()
    ? lookupProduct(fixtures, { query: sourceText, category: category === "unknown" ? "" : category })
    : { match_status: "manual_only", candidates: [] };
  const topCandidate = lookup.candidates?.[0] || null;
  const candidate = topCandidate && (category === "unknown" || topCandidate.category === category)
    ? topCandidate
    : null;
  const candidateProfile = candidate?.energy_profile || {};
  const hints = extractProductHints(sourceText);

  const runtimeMinutes = firstNumber(
    manual.runtime_minutes,
    request.runtime_minutes,
    hints.runtime_minutes,
    categoryDefaultRuntimeMinutes(category)
  );
  const runtimeHours = runtimeMinutes / 60;
  const powerKw = firstNumber(
    manual.power_kw,
    request.power_kw,
    hints.power_kw,
    manual.power_w !== undefined ? Number(manual.power_w) / 1000 : undefined
  );
  const cycleKwh = firstNumber(
    manual.cycle_kwh,
    request.cycle_kwh,
    hints.cycle_kwh,
    energyProfileCycleKwh(candidateProfile),
    powerKw !== null ? powerKw * runtimeHours : undefined
  );
  const energyKnown = cycleKwh !== null;
  const cyclesPerWeek = firstNumber(manual.cycles_per_week, request.cycles_per_week, hints.cycles_per_week, 1);
  const flexibleLoad = manual.flexible_load !== undefined
    ? Boolean(manual.flexible_load)
    : candidateProfile.flexible_load !== undefined ? Boolean(candidateProfile.flexible_load) : (
      ["dishwasher", "washing_machine", "dryer", "ev", "heat_pump"].includes(category)
    );
  const currentPrice = fixtures.contract.price_rules.current_import_price_eur_per_kwh;
  const smartWindow = cheapestForecastWindow(fixtures);
  const immediateCost = energyKnown ? cycleKwh * currentPrice : null;
  const smartCost = energyKnown ? cycleKwh * smartWindow.price_eur_per_kwh : null;
  const saving = energyKnown ? Math.max(0, immediateCost - smartCost) : null;
  const confidenceParts = [
    candidate?.confidence || 0,
    manual.cycle_kwh || manual.power_kw || manual.power_w ? 0.9 : 0,
    request.label_text || request.photo_ocr_text ? 0.72 : 0,
    sourceText ? 0.62 : 0
  ].filter(Boolean);
  const confidence = confidenceParts.length
    ? round(confidenceParts.reduce((sum, value) => sum + value, 0) / confidenceParts.length, 2)
    : 0.45;
  const productName = [
    candidate?.brand,
    candidate?.model
  ].filter(Boolean).join(" ") || String(request.model_text || request.query || "User supplied product").trim();

  return {
    profile_id: `profile_${Date.now()}`,
    connector_version: CONNECTOR_VERSION,
    intake_modes: {
      accepted_now: ["natural_text", "manual_power_fields", "ocr_text_from_photo"],
      photo_pipeline_design: [
        "Capture label or model plate photo in the app.",
        "Run OCR/vision extraction to obtain model, category, rated W/kW, kWh per cycle, QR/barcode text.",
        "Call this endpoint with label_text/photo_ocr_text plus any user-confirmed fields.",
        "Ask the user to confirm before the value affects bill forecasts."
      ]
    },
    product: {
      name: productName,
      category,
      match_status: candidate ? lookup.match_status : (
        lookup.match_status === "candidate_found" ? "no_category_match" : lookup.match_status
      ),
      candidate: candidate ? {
        product_id: candidate.product_id,
        brand: candidate.brand,
        model: candidate.model,
        source: candidate.source
      } : null,
      user_confirmation_required: true
    },
    normalized_energy_profile: {
      cycle_kwh: energyKnown ? round(cycleKwh, 3) : null,
      power_kw: powerKw === null ? null : round(powerKw, 3),
      runtime_minutes: round(runtimeMinutes, 1),
      cycles_per_week: round(cyclesPerWeek, 2),
      weekly_kwh: energyKnown ? round(cycleKwh * cyclesPerWeek, 3) : null,
      flexible_load: flexibleLoad,
      formula: !energyKnown
        ? "needs energy per cycle or power_kw plus runtime_hours"
        : powerKw === null
        ? "cycle_kwh from product label/catalog/user input"
        : "energy_kwh = power_kw x runtime_hours"
    },
    optimization_preview: {
      recommendation: !energyKnown
        ? "Confirm kWh per cycle, rated W/kW, or a real meter reading before this product affects the schedule."
        : flexibleLoad
        ? `Run during the cheapest suitable window around ${formatTimeFromIso(smartWindow.interval_start)} if it does not conflict with the household routine.`
        : "Keep this device in the baseline forecast; do not move it only for price optimization.",
      current_tariff_cost_eur: energyKnown ? round(immediateCost, 2) : null,
      smart_window_cost_eur: energyKnown ? round(smartCost, 2) : null,
      estimated_saving_per_run_eur: energyKnown ? round(saving, 2) : null,
      smart_window: smartWindow,
      user_experience_rule: flexibleLoad
        ? "Ask for a latest-finish time and noise/comfort preference before scheduling."
        : "Avoid nudging the user for always-on or comfort-critical loads."
    },
    ai_planning_context: {
      allowed_ai_role: "Explain the backend calculation, ask for missing comfort/deadline fields, and compare timing options.",
      forbidden_ai_role: "Do not invent product specs, prices, or device state. Do not claim photo recognition is exact without user confirmation.",
      prompt_facts: [
        `Product: ${productName}`,
        `Category: ${category}`,
        energyKnown ? `Energy per run: ${round(cycleKwh, 3)} kWh` : "Energy per run: needs confirmation",
        energyKnown ? `Current cost: ${round(immediateCost, 2)} EUR` : "Current cost: not calculated until energy is confirmed",
        energyKnown ? `Smart-window cost: ${round(smartCost, 2)} EUR` : "Smart-window cost: not calculated until energy is confirmed",
        `Flexible load: ${flexibleLoad ? "yes" : "no"}`
      ]
    },
    source_quality: [
      {
        field: "product_match",
        source: candidate?.source?.type || "user_supplied_text",
        status: candidate ? "candidate_found" : "manual_or_ocr_text",
        unit: "match",
        value: lookup.match_status,
        confidence
      },
      {
        field: "energy_per_run",
        source: manual.cycle_kwh || manual.power_kw || manual.power_w
          ? "user_confirmed_input"
          : candidate ? "data/product-catalog.json" : "parsed_text_estimate",
        status: !energyKnown
          ? "missing_energy_input"
          : manual.cycle_kwh || manual.power_kw || manual.power_w ? "user_confirmed" : "needs_user_confirmation",
        unit: "kWh",
        value: energyKnown ? round(cycleKwh, 3) : null,
        confidence: energyKnown ? confidence : 0.25
      }
    ],
    external_retrieval_design: {
      public_sources: [
        "EU EPREL / energy label QR or product registration where available",
        "Manufacturer manuals and technical data sheets",
        "Retailer specification pages",
        "Barcode/QR extraction from product label photos"
      ],
      recognition_engines: [
        "OCR engine for label text extraction",
        "Vision model for category/model/energy-label field extraction",
        "Barcode or QR decoder before general OCR when a code is visible"
      ]
    }
  };
}

function parseLocalizedNumber(value) {
  if (value === undefined || value === null) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function findPricePerKwh(text) {
  const ctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ct|cent|cents)\s*(?:\/|\s*per\s*)?kwh/i);
  if (ctMatch) return round(parseLocalizedNumber(ctMatch[1]) / 100, 3);

  const eurMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:eur|euro|EUR)\s*(?:\/|\s*per\s*)?kwh/i);
  if (eurMatch) return round(parseLocalizedNumber(eurMatch[1]), 3);

  return null;
}

function findMonthlyFee(text) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:eur|euro|EUR)\s*(?:\/|\s*per\s*)?(?:month|monat|mo\.)/i);
  return match ? round(parseLocalizedNumber(match[1]), 2) : null;
}

function findNoticeDays(text) {
  const match = text.match(/(\d{1,3})\s*(?:days|tage|tag)\s*(?:notice|kundigungsfrist|kuendigung)/i);
  return match ? Number(match[1]) : null;
}

function parseContractText(fixtures, request = {}) {
  const text = String(request.text || "").trim();
  const fixtureRules = fixtures.contract.price_rules;
  const parsedPrice = text ? findPricePerKwh(text) : null;
  const parsedFee = text ? findMonthlyFee(text) : null;
  const parsedNotice = text ? findNoticeDays(text) : null;

  return {
    parser_id: "contract_rule_parser_v0",
    connector_version: CONNECTOR_VERSION,
    parse_mode: text ? "rule_based_text_parser" : "fixture_contract_parser",
    source_status: text ? "user_supplied_text" : "fixture_contract",
    extracted_terms: {
      current_import_price_eur_per_kwh: parsedPrice ?? fixtureRules.current_import_price_eur_per_kwh,
      standing_charge_eur_per_month: parsedFee ?? fixtureRules.standing_charge_eur_per_month,
      metering_fee_eur_per_month: fixtureRules.metering_fee_eur_per_month,
      feed_in_credit_eur_per_kwh: fixtureRules.feed_in_credit_eur_per_kwh,
      cancellation_notice_days: parsedNotice ?? fixtures.contract.contract.cancellation_notice_days,
      vat_included: fixtureRules.vat_included
    },
    confidence: {
      current_import_price_eur_per_kwh: parsedPrice === null ? 0.92 : 0.74,
      standing_charge_eur_per_month: parsedFee === null ? 0.84 : 0.7,
      cancellation_notice_days: parsedNotice === null ? 0.84 : 0.66
    },
    needs_user_confirmation: true,
    plain_english: "The parser extracts the values that affect calculations first: final import price, fixed monthly fees, feed-in credit, VAT inclusion, and notice period. A homeowner should confirm extracted terms before they become the source of truth."
  };
}

module.exports = {
  CONNECTOR_VERSION,
  buildProductUsageProfile,
  lookupProduct,
  makeConnectorStatus,
  parseContractText,
  refreshConnectors
};
