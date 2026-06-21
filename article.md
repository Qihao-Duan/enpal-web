# Research Brief for Presentation Slide — Enpal Smart Energy Companion Repo

Last updated: 2026-06-21  
Owner: deep_researcher  
Research mode: internet-backed + local repository inspection  
Project folder: `/Users/qihao/Documents/enpal-web`

## Executive Thesis

This repo is strongest when presented as a **trust-first household energy decision companion**, not as a generic dashboard. The prototype turns a messy German electrified-home context — PV, battery, EV, heat pump, grid import/export, dynamic tariff, and contract terms — into one understandable action:

> **Do not charge the EV immediately. Use solar first, then low-price grid power, saving EUR 5.16 versus charging now — with every money number traceable to deterministic calculations and source-quality metadata.**

The implementation supports this story with a runnable static UI (`prototype.html`) served by a no-dependency Node API (`src/server.js`), deterministic calculation modules, synthetic but realistic fixture data, source-quality/audit fields, a scripted AI explanation layer, and tests that currently pass. The slide should emphasize the repo’s differentiated proof point: **AI explains; the backend calculates.**

## Research Frame And Scope

- User request interpreted as: research the local repo and its research plan/implementation details to prepare a presentation slide.
- Assumed audience: hackathon judges, product reviewers, or technical stakeholders evaluating the prototype.
- Output language: English, consistent with repo constraints that product UI, code names, data fields, docs, and demo copy remain English.
- Source mode: local project files are the source of truth for implementation claims; web sources are used only for market/context grounding.
- Constraint: all repo demo data is synthetic and must not be presented as real customer telemetry, real tariff data, or real market prices.

## Why This Problem Matters

The challenge brief frames the core homeowner problem as a comprehension gap: after a home adds solar, battery, heat pump, EV charging, dynamic tariffs, and contract terms, the data exists but is scattered and hard to understand. The average homeowner still needs simple answers: whether they are saving money, when to run loads, why bills are high, and whether numbers are trustworthy.

The repo’s product response is sharply aligned with the user pain points recorded in `requirement.md`:

1. Explain kWh with a formula a non-expert can understand.
2. Compare a reasonable plan against “charge/use now without thinking.”
3. Explain why the number can be trusted, briefly and plainly.

The wider market context supports this direction: Enpal’s public product ecosystem includes PV, heat pump, wallbox, smart energy manager, and tariff offerings; German household electricity bills combine usage-based work price and fixed/base elements; and smart tariffs from providers such as Octopus show that EV charging, solar export, and time-shifting are recognizable energy-management jobs. These web sources validate the category, but the slide’s factual demo claims should stay grounded in the local repo.

## Product Strategy Found In The Repo

The repo intentionally chooses depth over breadth. The current product spine is EV smart charging for a German household:

1. Show one best action now.
2. Compare charging immediately with a smarter plan.
3. Explain kWh and cost in plain English.
4. Show why every money number is trustworthy.
5. Let the assistant explain backend-calculated results without inventing prices, savings, or device state.

The winning demo narrative is therefore not “we built many features.” It is:

> **A homeowner plugs in an EV; the companion turns energy complexity into a single trusted decision, then shows the formula and source trail behind it.**

## Implementation Evidence

### Runnable architecture

The current repo has a stable no-dependency Node prototype rather than a premature full framework migration. The key runtime pieces are:

- `prototype.html` — the main Decision Workbench UI.
- `src/server.js` — static host and `/api/*` router.
- `src/lib/api-handlers.js` — API boundary for demo state, calculations, recommendations, connectors, product lookup, contracts, appliance telemetry, devices, and assistant answers.
- `src/lib/energy-calculations.js` — deterministic EV recommendation, live intervals, tariff intervals, and bill forecast.
- `src/lib/energy-routing.js` — deterministic use/store/sell/buy routing allocation.
- `src/lib/connectors.js` — fixture-backed connector/status/product/contract parsing layer.
- `src/lib/assistant.js` — grounded scripted explanation layer and prompt-contract shape.
- `data/*.json` — synthetic household, tariff, forecast, device, recommendation, product, and routing fixtures.
- `tests/*.test.js` — Node assertion tests for calculations, routing, telemetry, product profile, and home-device store.

### API surface

The repo exposes a coherent demo API:

- `/api/health`
- `/api/demo-state`
- `/api/calculations/live`
- `/api/recommendations/ev-charging`
- `/api/energy-routing/plan`
- `/api/connectors/status`
- `/api/connectors/refresh`
- `/api/products/lookup`
- `/api/products/profile`
- `/api/devices`
- `/api/contracts/parse`
- `/api/assistant/ask`
- `/api/appliance-telemetry/today`
- `/api/appliance-telemetry/readings`

This is enough to credibly present the prototype as app-shaped: the UI can be static, but calculations, source metadata, assistant grounding, and connector boundaries already sit behind APIs.

### Deterministic EV smart charging proof point

The canonical fixture path is:

- Required EV energy: **24.0 kWh**.
- Current import price: **0.35 EUR/kWh**.
- Immediate-charge cost: **24.0 × 0.35 = EUR 8.40**.
- Smart plan: **6.0 kWh solar surplus** + **18.0 kWh low-price grid**.
- Low-price import price: **0.18 EUR/kWh**.
- Smart cash cost: **EUR 3.24**.
- Cash saving: **EUR 5.16**, or **61.4%** versus immediate charging.
- Economic cost including missed solar feed-in credit: **EUR 3.73**.
- Economic saving including solar opportunity cost: **EUR 4.67**.

These values are encoded in `data/ev-charging-recommendation.json` and recomputed by `src/lib/energy-calculations.js`. A local calculation probe confirmed the same headline values and that the default smart schedule sums to 24 kWh.

### Deterministic use/store/sell/buy routing

The newer energy-routing layer generalizes the EV story into a “route each kWh to its best use” workbench. A local probe of `calculateEnergyRouting()` returned:

- Total allocated energy: **74.9 kWh**.
- Use: **25.0 kWh**.
- Store: **17.2 kWh**.
- Sell: **1.7 kWh**.
- Buy: **31.0 kWh**.
- EV energy routed: **24.0 kWh** = **6.0 kWh solar** + **18.0 kWh grid**.
- Deadline check: met.
- Source-quality records: 9.
- Audit steps: route solar, route grid, opportunity cost, deadline check.

This gives the slide a stronger visual metaphor than a chatbot: **a routing board that shows why every kWh goes to use, store, sell, or buy.**

## AI Boundary And Trust Architecture

The repo’s most important technical principle is that the assistant is not the calculation engine. The research and implementation files repeat the same constraint:

- Money, kWh, tariff, schedule, and savings values come from deterministic backend calculation code.
- AI explains and summarizes; it does not decide or calculate customer-facing financial values.
- Every savings-bearing response must include calculation metadata such as `calculated_at`, `valid_until`, `input_snapshot_id`, `formula_version`, and `source_quality`.
- Public market prices must not be presented as final customer contract prices unless normalized by tariff rules.
- Solar self-consumption has two views: cash cost can be zero while economic opportunity cost reflects missed feed-in credit.
- The current demo remains advice-only unless explicit consent/control state is implemented.

The assistant’s trust answer explicitly ties the recommendation to named sources: tariff contract, EV/wallbox state, solar forecast, and low-price tariff window. This is the phrase the presentation should preserve: **“backend-calculated, assistant-explained.”**

## UI Story Found In The Prototype

The current UI supports a judge-friendly flow with headings such as:

- “Make today’s energy choices feel obvious.”
- “Every kWh, routed to its best use.”
- “Energy Companion.”
- “Energy check.”
- “Why trust this.”
- “EV smart charging decision.”
- “Automatic data retrieval.”
- “Device cost translator.”
- “Household impact simulator.”
- “AI assistant prompts.”

The presentation slide should not over-explain all UI modules. It should use the UI as evidence of a coherent product promise: a homeowner sees one action, the calculated saving, and a trust receipt.

## Demo Readiness And Risks

`npm test` passed on 2026-06-21 for:

- `energy-calculations.test.js`
- `energy-routing.test.js`
- `appliance-telemetry.test.js`
- `product-profile.test.js`
- `home-device-store.test.js`

However, the QA review records important demo guardrails:

1. Keep the EV request on the default **24 kWh** path unless feasibility logic is fixed.
2. Do not claim arbitrary recalculations are demo-safe yet; override requests can expose stale source-quality metadata or impossible schedules.
3. Align backend-generated schedule shape with fixture/docs before presenting raw schedules.
4. Avoid showing raw timestamp payloads until local/UTC formatting is cleaned up.
5. Make fallback/API-unavailable states obvious if the live server is not running.
6. State clearly that the data is synthetic and the demo is advice-only.

These risks do not weaken the core slide message if framed correctly. They show that the team knows where the proof is strong and where production hardening remains.

## Recommended Single-Slide Story

Suggested slide title:

> **Enpal Smart Energy Companion: one trusted action from messy home energy data**

Suggested slide structure:

- **Left — Problem:** German electric homes have PV, battery, heat pump, EV, dynamic tariff, and contract data, but homeowners still ask: “What should I do now?”
- **Center — Demo proof:** EV needs 24 kWh. Charging now costs EUR 8.40. Smart plan uses solar + low-price grid and costs EUR 3.24. **Saving: EUR 5.16 / 61.4%.**
- **Right — Why credible:** deterministic calculation API, source-quality metadata, audit steps, advice-only consent boundary, AI explanation grounded in backend outputs.
- **Bottom strapline:** **AI explains. Backend calculates. Every kWh gets routed to use, store, sell, or buy.**

Must-appear text candidates for the slide:

- “24 kWh EV need”
- “EUR 8.40 charge now”
- “EUR 3.24 smart plan”
- “Save EUR 5.16”
- “Source-quality + audit trail”
- “Synthetic demo data · Advice-only control”

## Evidence Summary

- Core problem and pain points: `requirement.md`.
- Product/engineering principles: `ENGINEERING_ALIGNMENT.md`, `docs/software-framework-plan.md`.
- Trust and data contracts: `docs/data-contract.md`.
- Current implementation: `src/server.js`, `src/lib/api-handlers.js`, `src/lib/energy-calculations.js`, `src/lib/energy-routing.js`, `src/lib/assistant.js`, `src/lib/connectors.js`.
- Demo values: `data/ev-charging-recommendation.json`, `data/tariff-contract.json`, `data/forecasts-24h.json`, `data/device-state.json`.
- UI narrative: `prototype.html`.
- Risks and guardrails: `docs/qa-review.md`.
- Test status: `npm test` passed on 2026-06-21.
