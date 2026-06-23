const {
  calculateBillForecast,
  calculateEvRecommendation,
  calculateLiveState
} = require("./energy-calculations");

const PROMPT_VERSION = "energy-companion.prompt.v0.1.0";

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function formatEuro(value) {
  return `EUR ${round(value, 2).toFixed(2)}`;
}

function formatKwh(value) {
  return `${round(value, 1).toFixed(1)} kWh`;
}

function formatEurPerKwh(value) {
  return `${round(value, 2).toFixed(2)} EUR/kWh`;
}

function formatTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "n/a").slice(11, 16) || "n/a";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin"
  }).format(date);
}

function formatTimeRange(start, end) {
  return `${formatTimeLabel(start)}-${formatTimeLabel(end)}`;
}

function sum(items, selector) {
  return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function detectIntent(question) {
  const normalized = String(question || "").toLowerCase();
  if (/\b(charge|car|ev|vehicle|wallbox|充电|车)\b/.test(normalized)) return "ev_charging";
  if (/\b(bill|cost|expensive|high|higher|month|invoice|账单|电费|贵)\b/.test(normalized)) return "bill_high";
  if (/\b(save|saving|money|compare|difference|省钱|节省|相比)\b/.test(normalized)) return "savings_explain";
  if (/\b(trust|believe|confidence|source|reliable|why.*true|可信|相信|来源)\b/.test(normalized)) return "trust";
  if (/\b(kwh|kilowatt|meaning|formula|公式|什么意思|概念)\b/.test(normalized)) return "kwh_explain";
  return "general";
}

function buildContext(fixtures, overrides = {}) {
  const recommendation = calculateEvRecommendation(fixtures, overrides.ev_request || {});
  const live = calculateLiveState(fixtures);
  const bill = calculateBillForecast(fixtures);
  const schedule = recommendation.smart_plan.schedule || [];
  const solarItems = schedule.filter((item) => item.source === "solar_surplus");
  const lowPriceItems = schedule.filter((item) => item.source === "grid_low_price");
  const lowPriceStart = lowPriceItems[0]?.start || fixtures.contract.ev_charging_demo_terms.low_price_window.start;
  const lowPriceEnd = lowPriceItems[lowPriceItems.length - 1]?.end || fixtures.contract.ev_charging_demo_terms.low_price_window.end;

  return {
    household: fixtures.household,
    contract: fixtures.contract,
    forecast: fixtures.forecast,
    deviceState: fixtures.deviceState,
    recommendation,
    live,
    bill,
    solarEnergyKwh: sum(solarItems, (item) => item.energy_kwh) || recommendation.smart_plan.solar_surplus_used_kwh,
    lowPriceEnergyKwh: sum(lowPriceItems, (item) => item.energy_kwh) || recommendation.smart_plan.low_price_grid_energy_kwh,
    lowPriceWindow: formatTimeRange(lowPriceStart, lowPriceEnd)
  };
}

function makeEvidence(context) {
  const rec = context.recommendation;
  return [
    {
      label: "Current grid price",
      value: formatEurPerKwh(context.contract.price_rules.current_import_price_eur_per_kwh),
      source: "Contract tariff terms"
    },
    {
      label: "EV energy needed",
      value: formatKwh(rec.ev_request.required_energy_kwh),
      source: "Vehicle / wallbox state"
    },
    {
      label: "Solar usable for EV",
      value: formatKwh(context.solarEnergyKwh),
      source: "Solar forecast"
    },
    {
      label: "Low-price window",
      value: `${context.lowPriceWindow} at ${formatEurPerKwh(rec.smart_plan.low_price_grid_price_eur_per_kwh)}`,
      source: "Tariff fixture"
    }
  ];
}

function answerForIntent(intent, question, context) {
  const rec = context.recommendation;
  const bill = context.bill;
  const currentPrice = context.contract.price_rules.current_import_price_eur_per_kwh;
  const monthlyBase =
    context.contract.price_rules.standing_charge_eur_per_month +
    context.contract.price_rules.metering_fee_eur_per_month;

  if (intent === "ev_charging") {
    return {
      short_answer: "No. Do not charge the car immediately.",
      explanation: `Charging now would use ${formatKwh(rec.ev_request.required_energy_kwh)} at ${formatEurPerKwh(currentPrice)}. The smart plan uses ${formatKwh(context.solarEnergyKwh)} of solar first, then ${formatKwh(context.lowPriceEnergyKwh)} during ${context.lowPriceWindow}.`,
      calculation: `Charge now: ${formatEuro(rec.naive_plan.cash_cost_eur)}. Smart plan: ${formatEuro(rec.smart_plan.cash_cost_eur)}. Saving: ${formatEuro(rec.savings.cash_savings_eur)}.`,
      recommendation: "Wait for rooftop solar this afternoon, then finish the EV during the cheaper grid window tonight.",
      trust: "This answer is grounded in the EV energy request, current contract price, low-price tariff window, and solar forecast."
    };
  }

  if (intent === "bill_high") {
    return {
      short_answer: "The bill is likely high because grid electricity is being used during expensive hours and fixed monthly fees are always included.",
      explanation: `The forecast imports ${formatKwh(bill.import_kwh_excluding_ev)} from the grid before EV charging. The contract also adds about ${formatEuro(monthlyBase)} per month in standing and metering fees.`,
      calculation: `Forecast variable cost excluding EV: ${formatEuro(bill.variable_cost_eur_excluding_ev)} per day. Base fee: ${formatEuro(bill.daily_base_fee_eur)} per day. Projected monthly cost excluding EV: ${formatEuro(bill.projected_monthly_cost_eur_excluding_ev)}.`,
      recommendation: "Move flexible loads away from the evening peak, use solar surplus first, and avoid immediate EV charging when the current grid price is high.",
      trust: "This uses tariff terms, 24-hour load/solar forecast, grid import forecast, and the fixed-fee contract terms."
    };
  }

  if (intent === "savings_explain") {
    return {
      short_answer: `The saving is measured against charging immediately, not against doing nothing.`,
      explanation: `Immediate charging costs ${formatEuro(rec.naive_plan.cash_cost_eur)}. The recommended plan costs ${formatEuro(rec.smart_plan.cash_cost_eur)} because it uses solar surplus and cheaper grid electricity.`,
      calculation: `${formatEuro(rec.naive_plan.cash_cost_eur)} - ${formatEuro(rec.smart_plan.cash_cost_eur)} = ${formatEuro(rec.savings.cash_savings_eur)}.`,
      recommendation: "Use the smart plan when the departure deadline still allows it.",
      trust: "The formula uses the same required EV energy in both scenarios, so the comparison is fair."
    };
  }

  if (intent === "trust") {
    return {
      short_answer: "You can trust the direction of the recommendation, but this prototype still uses synthetic demo data.",
      explanation: "Each number is tied to a named source: tariff contract, vehicle/wallbox state, solar forecast, and the low-price window.",
      calculation: rec.calculation.source_quality
        .map((source) => `${source.field}: ${source.value} ${source.unit || ""}, confidence ${Math.round(source.confidence * 100)}%`)
        .join("; "),
      recommendation: "Before real automation, ask the user to confirm contract terms and device model data.",
      trust: "The assistant should always show sources and limitations instead of presenting a black-box answer."
    };
  }

  if (intent === "kwh_explain") {
    return {
      short_answer: "kWh means how much energy was used, while kW means how fast energy is being used.",
      explanation: "Think of kW as speed and kWh as distance. A 2 kW appliance running for 3 hours uses 6 kWh.",
      calculation: "Energy cost = kWh used x EUR/kWh price. Example: 24 kWh x 0.35 EUR/kWh = EUR 8.40.",
      recommendation: "For decisions, look at both the kWh needed and the EUR/kWh price at the time you use it.",
      trust: "This is a standard electricity billing formula and matches the EV charging calculation shown in the prototype."
    };
  }

  return {
    short_answer: "The best current action is to wait before charging the EV.",
    explanation: `The home can use ${formatKwh(context.solarEnergyKwh)} of solar and then finish during ${context.lowPriceWindow}.`,
    calculation: `Smart charging saves ${formatEuro(rec.savings.cash_savings_eur)} compared with charging immediately.`,
    recommendation: "Ask about the bill, EV charging, savings, kWh, or why the numbers are trustworthy.",
    trust: "Answers are grounded in the current household fixture, tariff terms, device state, and forecast."
  };
}

function buildPromptContract(question, context, intent) {
  return {
    version: PROMPT_VERSION,
    system_role: "You are Enpal Smart Energy Companion, an energy explainer for German homes and energy sites.",
    content_understanding: {
      detected_intent: intent,
      user_question: question,
      required_reasoning: [
        "Classify the user's intent before answering.",
        "Ground every answer in contract terms, device state, forecast, or calculation outputs.",
        "Prefer short plain English over energy-engineering language.",
        "Show the comparison baseline whenever savings are mentioned.",
        "State why the answer is trustworthy and what data is still synthetic or uncertain."
      ]
    },
    grounding_snapshot: {
      household_id: context.household.household_id,
      timezone: context.household.timezone,
      current_import_price_eur_per_kwh: context.contract.price_rules.current_import_price_eur_per_kwh,
      ev_required_energy_kwh: context.recommendation.ev_request.required_energy_kwh,
      solar_surplus_kwh: context.solarEnergyKwh,
      low_price_window: context.lowPriceWindow,
      low_price_eur_per_kwh: context.recommendation.smart_plan.low_price_grid_price_eur_per_kwh,
      naive_cost_eur: context.recommendation.naive_plan.cash_cost_eur,
      smart_cost_eur: context.recommendation.smart_plan.cash_cost_eur,
      savings_eur: context.recommendation.savings.cash_savings_eur
    },
    answer_format: [
      "Short answer",
      "Why",
      "Cost / formula",
      "Recommended next step",
      "Why this is trustworthy"
    ]
  };
}

function answerEnergyQuestion(fixtures, body = {}) {
  const question = String(body.question || body.message || "").trim() || "Should I charge the car now?";
  const context = buildContext(fixtures, body);
  const intent = detectIntent(question);
  const answer = answerForIntent(intent, question, context);

  return {
    assistant: "Enpal Energy Companion",
    prompt_contract: buildPromptContract(question, context, intent),
    question,
    intent,
    answer,
    evidence: makeEvidence(context),
    suggested_questions: [
      "Should I charge the car now?",
      "Why is my bill high?",
      "How did you calculate the saving?",
      "Why should I trust this number?"
    ],
    limitations: context.recommendation.trust.limitations
  };
}

module.exports = {
  PROMPT_VERSION,
  answerEnergyQuestion,
  detectIntent
};
