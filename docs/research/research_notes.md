# Research Notes — Enpal Smart Energy Companion Repo

Last updated: 2026-06-21  
Owner: deep_researcher  
Project folder: `/Users/qihao/Documents/enpal-web`

## Research Question

Research the local repo, research plan, and implementation details to support a presentation slide about the Enpal Smart Energy Companion prototype.

## Working Interpretation

The requested slide should summarize the value and implementation of the repo for a judge/stakeholder audience. It should be English-language and focus on the implemented MVP proof point, not every future feature.

## Sources Read Locally

- `requirement.md`
- `ENGINEERING_ALIGNMENT.md`
- `docs/software-framework-plan.md`
- `docs/data-contract.md`
- `docs/qa-review.md`
- `enpal-smart-energy-companion-design.html`
- `prototype.html`
- `data/household-profile.json`
- `data/tariff-contract.json`
- `data/forecasts-24h.json`
- `data/device-state.json`
- `data/ev-charging-recommendation.json`
- `data/energy-routing-plan.json`
- `src/server.js`
- `src/lib/api-handlers.js`
- `src/lib/energy-calculations.js`
- `src/lib/energy-routing.js`
- `src/lib/assistant.js`
- `src/lib/connectors.js`
- `tests/*.test.js`
- `enpal-track-dataset/README.md`

## Web Sources Checked

- Enpal official homepage, retrieved 2026-06-21: product ecosystem includes PV, heat pump, wallbox, Enpal.One+, energy tariff, and a 5-in-1 package.
- Bundesnetzagentur price-components page, retrieved 2026-06-21: work price/base price framing and German household electricity price components.
- Octopus Energy official homepage, retrieved 2026-06-21: smart tariffs and smart EV/solar propositions as a category reference.

These are contextual only. Repo implementation claims should cite local files.

## Key Evidence Extracts

### Challenge and pain points

- Challenge asks for a unified energy view, conversational layer, tariff intelligence, proactive insights/nudges, clarity, AI value, impact, execution, and originality.
- User pain points in `requirement.md` emphasize: explain kWh, compare planned charging versus “mindless” charging cost, and explain why numbers are trustworthy.

### Product thesis

- `ENGINEERING_ALIGNMENT.md` mission: build an English-language prototype for a German household energy assistant that turns solar, battery, EV, heat pump, grid, dynamic tariff, and contract data into one trusted decision.
- The strongest product line is: “What should I do next, how much money does it save, and why should I trust the number?”
- Product principles: English-only UI, plain language, deterministic money numbers, AI explains, source/unit/timestamp/confidence on every recommendation, read-only advice by default.

### Architecture plan

- `docs/software-framework-plan.md` states the product spine is EV smart charging.
- It explicitly says money, kWh, tariff, schedule, and savings values must come from deterministic backend calculation code; AI explains and summarizes.
- Current baseline is `prototype.html` plus no-dependency Node server and modules under `src/`.
- Near-term architecture favors stable calculation/API/consent/assistant contracts before Next.js migration.

### Implementation state

- `src/server.js` serves `prototype.html`, docs, data, and `/api/*` routes.
- `src/lib/api-handlers.js` exposes routes for health, demo state, live calculations, EV recommendations, energy routing, connector status/refresh, products, contracts, assistant, devices, and telemetry.
- `src/lib/energy-calculations.js` computes live state, bill forecast, EV now-vs-smart recommendation, source quality, trust limitations, and audit steps.
- `src/lib/energy-routing.js` computes use/store/sell/buy allocations, opportunity cost, deadline notes, source quality, and audit steps.
- `src/lib/assistant.js` detects intent and returns grounded scripted answers with a prompt contract; supported intents include EV charging, bill high, savings, trust, and kWh explanation.
- `src/lib/connectors.js` simulates external-ready fixture adapters for tariff/market, solar/weather, telemetry, contract parser, and product lookup.

### UI state

Headings extracted from `prototype.html` include:

- Every kWh, routed to its best use.
- Make today’s energy choices feel obvious.
- Why trust this.
- EV smart charging decision.
- Automatic data retrieval.
- Device cost translator.
- Household impact simulator.
- AI assistant prompts.

### Fixture values

From `data/` and local calculation probe:

- Household: `hh_de_berlin_001`, `Europe/Berlin`, `EUR`, PV, battery, EV, wallbox, heat pump, smart meter.
- Current tariff: `0.35 EUR/kWh`.
- Low-price window: `2026-06-20T22:00:00+02:00` to `2026-06-21T01:00:00+02:00` at `0.18 EUR/kWh`.
- Feed-in credit/opportunity cost basis: `0.081 EUR/kWh`.
- Forecast: 24 hourly records, 6.0 kWh EV-usable solar surplus, 43.9 kWh PV forecast total, 32.0 kWh household load excluding EV.
- EV request: 24.0 kWh required, plugged in, target 80%, departure deadline 2026-06-21 08:00 Europe/Berlin, wallbox max 11 kW.
- Immediate plan: EUR 8.40.
- Smart plan: EUR 3.24.
- Cash savings: EUR 5.16 / 61.4%.
- Economic cost with solar opportunity: EUR 3.73; economic savings EUR 4.67 / 55.6%.

### Energy-routing calculation probe

Local `node` probe returned:

```json
{
  "total_allocated_kwh": 74.9,
  "use_kwh": 25,
  "store_kwh": 17.2,
  "sell_kwh": 1.7,
  "buy_kwh": 31,
  "ev_energy_routed_kwh": 24,
  "ev_solar_kwh": 6,
  "ev_grid_kwh": 18,
  "cash_cost_eur": 6.92,
  "export_credit_eur": 0.14,
  "net_cash_cost_eur": 6.78,
  "opportunity_cost_eur": 3.42,
  "economic_cost_eur": 10.2
}
```

### Test status

Command run on 2026-06-21:

```text
npm test
```

Result: passed.

Subtests passed:

- energy calculation tests
- energy routing tests
- appliance telemetry tests
- product profile tests
- home device store tests

### QA risks

From `docs/qa-review.md`:

- Default 24 kWh path is internally consistent.
- Arbitrary EV energy overrides are risky because the backend can price more energy than the returned schedule supplies and can leave `deadline_met=true`.
- Source-quality metadata can remain stale for overrides.
- Backend schedule output can diverge from canonical fixture/docs.
- Generated schedule timestamps mix local `+02:00` starts with UTC `Z` ends.
- API fallback can mask failures if the top UI still looks confident.
- Accessibility semantics and responsive testing need hardening.

Research interpretation: presentation should avoid overclaiming production readiness and should say synthetic demo data + advice-only control.

## Slide-Relevant Takeaways

1. The repo’s unique angle is not visualizing energy data; it is turning energy complexity into one trusted action.
2. The proof point is numerical and concrete: 24 kWh EV charge, EUR 8.40 now vs EUR 3.24 smart, EUR 5.16 saving.
3. The implementation backs the story: deterministic Node calculation API, source-quality records, audit steps, and an AI explanation layer that does not invent numbers.
4. The slide can show three layers: homeowner question, calculation engine, trust receipt.
5. Include a small risk/disclaimer note: synthetic demo data, advice-only, default 24 kWh path is the safest demo path.

## Open Questions For User / Designer

- Is the desired output a single slide or a full deck? Current research assumes a single pitch slide.
- Should the slide be aimed at hackathon judges, Enpal product leadership, or engineering reviewers?
- Should the slide show a local UI screenshot as a visual reference, or use a clean infographic-style remake?
