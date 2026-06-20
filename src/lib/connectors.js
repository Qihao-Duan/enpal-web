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
  lookupProduct,
  makeConnectorStatus,
  parseContractText,
  refreshConnectors
};
