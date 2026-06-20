# Enpal Smart Energy Companion - Engineering Alignment

Status: active development sprint  
Primary language: English for all product UI, code names, data fields, documentation, and demo copy  
Workspace: `/Users/qihao/Documents/enpal-web`

## 1. Mission

Build an English-language web prototype for a German household energy assistant.

The product should turn solar production, battery state, EV charging needs, heat pump consumption, grid import/export, dynamic tariff data, and contract terms into one trusted decision:

> What should I do next, how much money does it save, and why should I trust the number?

The prototype should prioritize depth over breadth. The main demo scenario is EV smart charging:

- The user plugs in an EV.
- The system compares charging immediately with a smarter plan.
- The system explains kWh in everyday terms.
- The system shows the calculation and the trust/audit trail.
- The user can ask short grounded questions.

## 2. Product Principles

- English-only UI.
- Plain language before engineering terms.
- Every money number must come from deterministic calculations, not AI prose.
- AI explains; the calculation engine decides.
- Every recommendation must include source, unit, timestamp, and confidence.
- Public market data is not the same as the user's final contract price.
- Default mode is read-only advice; control/autopilot requires explicit user consent.
- Use Octopus Energy Explore only as an information architecture reference. Do not copy its brand, assets, copy, fonts, colors, mascot, or source code.

## 3. Current Source Documents

- Product challenge brief: `requirement.md`
- Research and design document: `enpal-smart-energy-companion-design.html`

The design document includes competitor analysis, Germany data source mapping, Octopus Energy Explore analysis, UI concepts, backend architecture, trust/audit requirements, and MVP scope.

## 4. Agent Team Roles

| Role | Owner | Scope | Write Ownership |
|---|---|---|---|
| Software Architecture Lead | agent | Architecture brief, stack, service boundaries, risks | No file edits unless asked |
| Frontend Implementation Worker | agent | Static English prototype UI and interactions | `prototype.html`, optional `assets/` |
| Data/Backend Simulation Worker | agent | Mock Germany household data and schemas | `data/`, `docs/data-contract.md` |
| QA/Test Engineering Reviewer | agent | Review plan, calculation checks, accessibility/responsiveness checklist | No file edits unless asked |
| Main Integrator | Codex main thread | Keep this alignment document current; integrate outputs; resolve conflicts | `ENGINEERING_ALIGNMENT.md` and final integration edits |

Workers are not alone in the codebase. They must not revert or overwrite work outside their assigned paths.

## 5. Recommended Prototype Stack

For this repository's immediate state:

- Phase 1 prototype: static HTML/CSS/JS plus a no-dependency Node.js calculation API.
- Primary prototype file: `prototype.html`.
- Mock data files: `data/*.json`.
- Runtime entrypoint: `src/server.js`.
- Calculation engine: `src/lib/energy-calculations.js`.
- Data contract: `docs/data-contract.md`.
- Coordination document: `ENGINEERING_ALIGNMENT.md`.

Future production-aligned stack:

- Frontend: Next.js App Router + TypeScript.
- UI: Enpal-owned design tokens and component library.
- Backend/BFF: TypeScript Fastify or NestJS.
- Data: PostgreSQL + TimescaleDB for time series; object storage for contracts/bills; vector store for contract snippets.
- AI: tool calling + RAG over contracts and audit records.
- Connectors: mock first; later OCPP, Home Assistant, smart meter/MSB, inverter/battery vendors, heat pump APIs.

Production-style repository layout, once we move beyond the static prototype:

```text
app/
  page.tsx
  energy-check/page.tsx
  household/[householdId]/page.tsx
  api/
    household/[id]/state/route.ts
    recommendations/route.ts
    ai/chat/route.ts
components/
  dashboard/
  energy-check/
  recommendation/
  trust/
  charts/
  ui/
lib/
  germany-profile.ts
  schemas/
  services/
  connectors/
  calculations/
data/mock/
docs/
```

The immediate sprint should not scaffold the full future app. It should make the current prototype runnable through a thin backend, so money numbers come from deterministic API calculations instead of inline UI constants.

## 5.0 Current Development Sprint

Goal: turn the existing static prototype and mock data into a runnable MVP with a real calculation API.

| Role | Current owner | Write scope |
|---|---|---|
| Architecture lead | agent | Read-only implementation guidance |
| Backend/data worker | agent | `package.json`, `src/`, `tests/energy-calculations.test.js` |
| Frontend worker | agent | `prototype.html` only |
| QA reviewer | agent | Read-only QA checklist/review |
| Main integrator | Codex main thread | Integration, verification, `ENGINEERING_ALIGNMENT.md` |

Target API contract:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Server status and version |
| `/api/demo-state` | GET | Combined household, contract, forecast, device state, recommendation, calculation metadata |
| `/api/calculations/live` | GET | Power intervals, tariff intervals, bill forecast, source quality, audit metadata |
| `/api/recommendations/ev-charging` | POST | Recalculate EV now-vs-smart plan from request overrides plus fixtures |
| `/api/connectors/status` | GET | Connector-ready adapter registry for Germany demo data sources |
| `/api/connectors/refresh` | POST | Refresh fixture adapters into normalized calculation signals |
| `/api/products/lookup` | POST | Product/model lookup from demo catalog with user-confirmation flag |
| `/api/contracts/parse` | POST | Rule-based tariff text parser with fixture fallback terms |

Backend responses that display savings must include:

```text
calculated_at
valid_until
input_snapshot_id
formula_version
source_quality[]
```

Frontend behavior:

- When served by `src/server.js`, `prototype.html` should fetch `/api/demo-state`.
- When opened as `file://` or API is unavailable, the existing inline canonical values remain as graceful fallback.
- The "Automatic data retrieval" panel should call the connector endpoints so users can see backend retrieval, source quality, and confirmation boundaries.
- UI remains English-only.

## 5.1 Service Boundaries

| Service | Responsibility | MVP Implementation |
|---|---|---|
| `HouseholdProfileService` | Household, address, systems, Germany profile | Static fixture |
| `ConsentService` | Connector scopes, user permission, control level | Static consent states |
| `ContractService` | Contract JSON/PDF extraction and tariff normalization | Mock contract JSON |
| `PublicDataService` | SMARD/ENTSO-E, Open-Meteo, PVGIS cache | Static sample forecast |
| `HouseholdDataService` | Canonical state from meter, PV, battery, EV, heat pump | Static device state |
| `ConnectorRetrievalService` | Provider status, refresh, product lookup, contract parsing | `src/lib/connectors.js` fixture adapters |
| `ForecastService` | PV surplus, price windows, heat pump demand | Static 24-hour curve |
| `OptimizerService` | EV now-vs-smart cost and schedule | `src/lib/energy-calculations.js` |
| `RecommendationService` | Today's Best Move and savings log | Backend-calculated recommendation payload |
| `TrustAuditService` | Sources, timestamps, confidence, formulas | Backend metadata plus fixture source quality |
| `AIOrchestrator` | Tool calling and grounded explanation | Scripted demo answers first |

## 5.2 Control And Consent States

| State | Meaning | UI Copy Direction |
|---|---|---|
| Read-only | The app can show advice but cannot control devices | "Advice only" |
| User-confirmed | The user approves a one-time action | "Start this plan" |
| Autopilot | The app can schedule within user-defined rules | "Autopilot enabled" |
| Revoked | Connector/control permission removed | "Disconnected" |

The prototype may show Autopilot as a future state, but it should not imply live device control.

## 6. MVP User Flow

1. User opens the Energy Check page.
2. User sees a household profile for Germany with solar, battery, EV, and heat pump.
3. User sees "Today's Best Move".
4. User sees a kWh explanation:

```text
Energy used (kWh) = device power (kW) x time (h)
Cost = energy used (kWh) x price (EUR/kWh)
```

5. User compares:

```text
Charge now:
24 kWh x 0.35 EUR/kWh = 8.40 EUR

Smart plan:
6 kWh solar surplus x 0 EUR/kWh
+ 18 kWh low-price grid x 0.18 EUR/kWh
= 3.24 EUR

Savings:
8.40 EUR - 3.24 EUR = 5.16 EUR
```

6. User sees a timeline:

- 10:00 Avoid high-price charging.
- 14:00 Use solar surplus.
- 22:00 Finish with low-price grid energy.
- 08:00 EV reaches target charge.

7. User sees "Why trust this?":

- Contract price.
- EV required kWh and deadline.
- Solar forecast.
- Wallbox power limit.
- Data freshness.
- Calculation formula.

8. User can click example AI questions and receive grounded English answers.

## 6.1 Prototype Routes And Sections

For the static prototype, these are sections inside `prototype.html`.

| Section | Purpose |
|---|---|
| Hero / Energy Check | Explain the product and show household confidence level |
| Today's Best Move | One primary recommendation with savings |
| kWh Translator | Explain energy and cost formula |
| Now vs Smart Plan | Show deterministic calculation |
| 24-hour Timeline | Show solar and low-price windows |
| Why Trust This | Source badges and audit trail |
| Ask Energy AI | Scripted grounded Q&A |
| Connector Readiness | Estimate / Bill / Meter / Autopilot ladder |

Future app routes:

- `/`: main decision dashboard.
- `/energy-check`: quote-style intake flow.
- `/household/[householdId]`: household detail view.
- `/methodology`: data source and calculation methodology.

## 7. Core UI Components

| Component | Purpose | Notes |
|---|---|---|
| EnergyCheckWizard | Collect home location, systems, precision level | Estimate / Bill / Meter / Autopilot |
| TodayBestMove | One primary recommendation | Action first, details second |
| KwhTranslator | Explain kWh and cost formula | Use everyday EV range analogy |
| NowVsSmartPlan | Compare naive vs optimized cost | Must show formulas |
| EnergyTimeline | Explain timing recommendation | Stable fixed-height rows on mobile |
| SourceBadge | Show data source, unit, interval, timestamp | Required for trust |
| WhyTrustThis | Human-readable audit trail | Must distinguish actual/forecast/estimate |
| AskEnergyAI | Example grounded questions and answers | AI explains computed output |
| ConnectorReadiness | Show Estimate/Bill/Meter/Autopilot confidence ladder | Useful for onboarding |

## 8. Data Model Draft

### Household Profile

```ts
type HouseholdProfile = {
  householdId: string
  country: "DE"
  locale: "en-DE"
  timezone: "Europe/Berlin"
  location: {
    city: string
    postalCode: string
    marketArea: "DE-LU"
  }
  systems: {
    solarKw: number
    batteryKwh: number
    wallboxKw: number
    hasHeatPump: boolean
    hasEv: boolean
  }
}
```

### Tariff Rule

```ts
type TariffRule = {
  tariffId: string
  currency: "EUR"
  currentImportPriceEurPerKwh: number
  lowPriceWindowEurPerKwh: number
  exportPriceEurPerKwh: number
  baseFeeEurPerMonth: number
  source: "contract" | "estimate" | "supplier_api"
  lastUpdated: string
}
```

### EV Recommendation

```ts
type EvChargingRecommendation = {
  recommendationId: string
  requiredKwh: number
  deadline: string
  naiveCostEur: number
  smartCostEur: number
  savingsEur: number
  schedule: {
    start: string
    end: string
    source: "solar_surplus" | "grid_low_price" | "grid_fallback"
    kwh: number
    priceEurPerKwh: number
  }[]
  audit: SourceBadge[]
}
```

## 9. Calculation Rules

Canonical demo values:

```text
required_kwh = 24
current_price = 0.35 EUR/kWh
solar_surplus_kwh = 6
solar_opportunity_cost = 0 EUR/kWh for MVP demo
low_price_grid_kwh = 18
low_price = 0.18 EUR/kWh

naive_cost = 24 x 0.35 = 8.40 EUR
smart_cost = (6 x 0) + (18 x 0.18) = 3.24 EUR
savings = 8.40 - 3.24 = 5.16 EUR
```

Later versions should use true solar opportunity cost:

```text
solar_self_use_value = import_price - export_price
solar_opportunity_cost = export_price
```

## 10. Germany Data Sources

| Source | Use | Prototype Strategy |
|---|---|---|
| Contract / bill PDF or JSON | Final user tariff, base fee, feed-in rate | Mock JSON first |
| SMARD / ENTSO-E | German market prices, generation, load | Cached sample curve |
| Open-Meteo / DWD | Weather and solar radiation | Mock forecast first |
| PVGIS | PV baseline production | Static location-based estimate |
| Smart meter / iMSys / MSB | Import/export and billing-grade consumption | Mock meter data |
| OCPP / Wallbox API | EV charging status and control | Simulated Wallbox |
| Home Assistant | Multi-device fallback | Future connector |
| SolarEdge / Enphase / SMA / Fronius | PV and battery telemetry | Future connector |
| MaStR | German asset registry sanity checks | Future non-blocking source |

## 11. Implemented Sprint Artifacts

Current files produced by the agent team and main integrator:

```text
ENGINEERING_ALIGNMENT.md
enpal-smart-energy-companion-design.html
requirement.md
prototype.html
data/
  household-profile.json
  tariff-contract.json
  forecasts-24h.json
  device-state.json
  ev-charging-recommendation.json
docs/
  data-contract.md
```

### `prototype.html`

Static English-language runnable prototype. It uses the Berlin EV demo as the default scenario and includes:

- One primary recommendation: delay EV charging and use solar plus the low-price grid window.
- Deterministic cost comparison: 8.40 EUR now vs 3.24 EUR smart plan, saving 5.16 EUR.
- kWh translator, timeline, trust/audit badges, scripted grounded AI answers, and an Energy Check intake.
- Additional Hamburg, Munich, and Leipzig scenario toggles for UX exploration.

### `data/*.json`

Germany-focused synthetic fixtures for one Berlin household:

- Household profile: row house in Berlin, PV, battery, EV, wallbox, heat pump, smart meter.
- Tariff contract: dynamic final customer import price, low-price window, feed-in/export value.
- 24-hour forecast: tariff curve, PV forecast, household load, EV-usable solar surplus.
- Device state: battery, EV, wallbox, heat pump, smart meter state.
- EV recommendation: canonical now-vs-smart calculation and schedule.

### `docs/data-contract.md`

Backend/data contract for fixture schemas, units, timestamps, confidence labels, calculation ownership, and future connector mapping.

## 11.1 Next File Plan

Next files if we move from static prototype to an app structure:

```text
src/
  app/
  components/
  lib/
tests/
  calculation/
  accessibility/
```

## 12. Quality Gates

Functional:

- The prototype loads by opening `prototype.html`.
- The page is English-only.
- English is intentional for this hackathon prototype, even though the target market is Germany.
- The EV cost comparison displays 8.40 EUR, 3.24 EUR, and 5.16 EUR.
- Timeline and trust/audit sections are visible.
- AI example questions return grounded answers from mock data.
- The Energy Check intake shows German address/PLZ context, household system type, and data precision.
- "Today's Best Move" shows one clear action, not a generic dashboard.
- Missing connector/data states degrade gracefully and explain what is mocked, estimated, stale, or unavailable.

Data:

- All money values match the canonical calculation.
- All source badges include source name, unit, timestamp or interval, and confidence.
- Actual / Forecast / Estimate labels are visually distinct.
- The UI never mixes public market price with the customer's final contractual price.
- Solar opportunity cost is explicit. If feed-in tariff is later included, expected savings must change.
- Time calculations use `Europe/Berlin`.

Accessibility:

- One H1.
- Semantic sections.
- Keyboard-focusable buttons.
- Clear focus states.
- Sufficient contrast.
- Responsive layout at mobile and desktop widths.
- Real labels on all inputs.
- Validation or warning messages use accessible alert semantics where applicable.
- Color is not the only signal for confidence, savings, or warnings.
- Reduced motion preference is respected.

Engineering:

- No external assets copied from Octopus.
- No hard dependency on network.
- No package manager required for the static prototype.
- Any future connector claims are labeled as planned, not implemented.
- Mocked values are not presented as live customer data.

Content:

- No Chinese copy in the runnable platform UI.
- German market terms are correct when used: `Arbeitspreis`, `Grundpreis`, `Einspeisevergütung`, `MaLo-ID`, `iMSys`, `DE-LU`.
- Avoid "guaranteed savings" unless contract and meter data support it.
- Use grounded AI language: "I calculated this from..." rather than vague confidence claims.

## 13. Risks And Decisions

| Risk | Mitigation |
|---|---|
| AI appears to invent savings | Keep all money calculations deterministic and show formulas |
| Public market price confused with final tariff | Use contract source badges and explicit wording |
| UI becomes an engineering dashboard | Lead with a single recommendation and plain-language explanation |
| Scope grows too wide | Keep EV smart charging as the demo spine |
| Octopus reference becomes too close | Use only abstract IA/component patterns and Enpal-owned design language |
| German compliance is oversimplified | Separate advice, user-confirmed control, and autopilot; document consent |

## 14. Open Questions

- Should the first runnable prototype remain a single static `prototype.html`, or should we scaffold a Next.js app after the demo concept is validated?
- Should the demo include a fake contract upload step, or start directly from a parsed contract JSON?
- Should solar surplus use zero cost in the demo, or should we introduce export opportunity cost immediately?
- Should the AI assistant be a scripted explanation panel for the hackathon demo, or wired to a real LLM later?

## 15. Decision Log

| Decision | Status | Rationale |
|---|---|---|
| Build the first runnable prototype as static HTML/CSS/JS | Accepted | Fastest route in the current lightweight repo |
| Use English for platform UI | Accepted | Explicit user requirement for this sprint |
| Use EV smart charging as the hero demo | Accepted | Strongest closed loop for kWh, cost, timing, and trust |
| Use solar opportunity cost as 0 EUR/kWh in the canonical demo | Accepted for MVP | Keeps the first calculation easy to understand; document future feed-in adjustment |
| Treat AI answers as scripted/grounded demo explanations first | Accepted for MVP | Avoids hallucinated prices before backend tools exist |
| Keep Octopus as IA reference only | Accepted | Avoids brand/copyright confusion |
