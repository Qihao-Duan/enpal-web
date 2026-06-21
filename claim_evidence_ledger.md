# Claim Evidence Ledger — Enpal Smart Energy Companion Presentation Research

Last updated: 2026-06-21  
Owner: deep_researcher  
Project folder: `/Users/qihao/Documents/enpal-web`

| Claim ID | Claim | Evidence Anchor | Confidence | Risk / Caveat | Slide Use |
| --- | --- | --- | --- | --- | --- |
| C001 | The prototype is best positioned as a trust-first decision companion, not a generic dashboard. | `requirement.md`; `ENGINEERING_ALIGNMENT.md` mission; `prototype.html` headings “Make today's energy choices feel obvious” and “Why trust this”. | High | Positioning claim, not a measured KPI. | Main slide thesis. |
| C002 | The MVP focus is EV smart charging for a German electrified household. | `docs/software-framework-plan.md` sprint objective; `ENGINEERING_ALIGNMENT.md` section 1; `data/device-state.json`. | High | Future product scope is broader; do not imply all future use cases are production-ready. | Center demo proof. |
| C003 | Customer-facing money, kWh, tariff, schedule, and savings values are intended to come from deterministic backend calculations, while AI explains. | `docs/software-framework-plan.md`; `ENGINEERING_ALIGNMENT.md` product principles; `src/lib/energy-calculations.js`; `src/lib/assistant.js`. | High | Current assistant is scripted/grounded, not a full LLM tool-calling implementation. | “AI explains. Backend calculates.” strapline. |
| C004 | The canonical EV demo compares EUR 8.40 immediate charging with EUR 3.24 smart charging, saving EUR 5.16. | `data/ev-charging-recommendation.json`; `data/tariff-contract.json`; `data/forecasts-24h.json`; local calculation probe via `calculateEvRecommendation()`. | High for default fixture | Only safe for the default 24 kWh fixture path; arbitrary overrides have QA risks. | Hero metric. |
| C005 | The smart plan uses 6.0 kWh solar surplus and 18.0 kWh low-price grid energy at 0.18 EUR/kWh. | `data/ev-charging-recommendation.json`; `data/forecasts-24h.json`; `data/tariff-contract.json`; local probe. | High for default fixture | Backend-generated schedule shape needs alignment with fixture/docs before raw schedule demo. | Calculation breakdown. |
| C006 | The implementation exposes an app-shaped API boundary for demo state, calculations, recommendations, routing, connectors, products, contracts, devices, telemetry, and assistant answers. | `src/lib/api-handlers.js`; `src/server.js`; `docs/software-framework-plan.md` route list. | High | API is no-dependency prototype, not production auth/storage. | Technical credibility lane. |
| C007 | The energy-routing layer generalizes the story into use/store/sell/buy allocations with source quality and audit steps. | `src/lib/energy-routing.js`; `data/energy-routing-plan.json`; local `calculateEnergyRouting()` probe. | High | Some fixture policy fields such as `created_at`/`formula_version` are null in the plan file; routing module adds runtime metadata. | Visual metaphor: route every kWh. |
| C008 | The UI already supports a Decision Workbench narrative. | `prototype.html` headings and UI modules; `ENGINEERING_ALIGNMENT.md` Decision Workbench sprint notes. | High | Visual quality/readability should be reviewed by deck designer before using screenshots. | Visual reference. |
| C009 | The project currently passes its Node test suite. | `npm test` run on 2026-06-21; `package.json`; `tests/*.test.js`. | High | Tests do not cover all demo risks, UI responsiveness, API invalid JSON, or accessibility states. | Small credibility note, not hero. |
| C010 | Demo readiness requires guardrails around EV overrides, source-quality metadata, timestamps, fallback visibility, and accessibility. | `docs/qa-review.md`. | High | These are unresolved risks; phrase as known hardening path, not as defects in the hero story. | Footnote / presenter notes. |
| C011 | The product category context is credible: Enpal publicly offers solar, heat pump, wallbox, energy manager, and tariff products. | Enpal official homepage, retrieved 2026-06-21. | Medium | Marketing page; do not use for implementation claims. | Background context only. |
| C012 | German electricity bills combine usage-based work price and fixed/base price components, supporting the prototype’s need to explain both kWh and fixed costs. | Bundesnetzagentur price-components page, retrieved 2026-06-21. | High for general context | Page gives average market context, not this household’s actual tariff. | Context/why trust needs bill explanation. |
| C013 | Smart tariffs and smart EV/solar propositions are a recognizable market pattern. | Octopus Energy official homepage, retrieved 2026-06-21. | Medium | UK provider context; repo explicitly says use Octopus as IA/reference only and do not copy brand/assets/copy. | Optional competitive/category reference. |

## Open / Unsupported Claims To Avoid

- Do not claim the prototype uses real Enpal customer data.
- Do not claim live device control or autopilot is enabled; current mode is advice-only.
- Do not claim arbitrary EV recalculation is safe until QA findings are fixed.
- Do not claim public market prices equal the customer’s final tariff price.
- Do not copy Octopus Energy branding, copy, fonts, colors, mascot, assets, or source code.
