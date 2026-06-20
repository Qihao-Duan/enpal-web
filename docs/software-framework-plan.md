# Enpal Smart Energy Companion Software Framework Plan

Status: next implementation sprint plan  
Primary UI language: English  
Baseline date: 2026-06-20  
Scope: architecture framework for the runnable prototype and its next app-shaped iteration

## 1. Sprint Objective

The next sprint should turn the current runnable prototype into a clearer software framework without losing demo stability.

The product spine remains EV smart charging for a German household:

1. Show one best action now.
2. Compare charging immediately with a smarter plan.
3. Explain kWh and cost in plain English.
4. Show why every money number is trustworthy.
5. Let the assistant explain backend-calculated results without inventing prices, savings, or device state.

Money, kWh, tariff, schedule, and savings values must come from deterministic backend calculation code. AI explains and summarizes; it does not decide or calculate customer-facing financial values.

## 2. Current Repository Baseline

There is currently no `src/prototype` directory. The prototype surface is `prototype.html` at the repository root, supported by a no-dependency Node server and domain modules under `src/`.

Current structure:

```text
prototype.html
enpal-smart-energy-companion-design.html
requirement.md
ENGINEERING_ALIGNMENT.md
docs/
  data-contract.md
data/
  household-profile.json
  tariff-contract.json
  forecasts-24h.json
  device-state.json
  ev-charging-recommendation.json
  product-catalog.json
src/
  server.js
  lib/
    api-handlers.js
    assistant.js
    connectors.js
    energy-calculations.js
    fixture-store.js
tests/
  energy-calculations.test.js
```

Current runtime responsibilities:

| Area | Current file | Role |
| --- | --- | --- |
| Static app host | `src/server.js` | Serves `prototype.html`, `data/`, `docs/`, and `/api/*`. |
| API boundary | `src/lib/api-handlers.js` | Routes demo state, calculations, connector actions, assistant answers, and parser calls. |
| Fixture loading | `src/lib/fixture-store.js` | Loads synthetic JSON data from `data/`. |
| Calculation engine | `src/lib/energy-calculations.js` | Recomputes EV recommendation, live intervals, tariff intervals, and bill forecast. |
| Retrieval layer | `src/lib/connectors.js` | Simulates connector status, refresh, product lookup, and contract parsing. |
| Assistant layer | `src/lib/assistant.js` | Provides grounded scripted answers and a prompt contract shape. |

## 3. Target App Structure

For the next sprint, keep the current Node prototype runnable and add structure around domain boundaries before introducing a full framework. Do not migrate to Next.js until the calculation, API, consent, and assistant contracts are stable.

Recommended near-term structure:

```text
src/
  server.js
  lib/
    api/
      routes.js
      response.js
    services/
      household-profile-service.js
      consent-service.js
      contract-service.js
      connector-retrieval-service.js
      forecast-service.js
      optimizer-service.js
      recommendation-service.js
      trust-audit-service.js
      ai-orchestrator.js
    calculations/
      power.js
      tariff.js
      cost.js
      ev-smart-charging.js
      energy-routing.js
    connectors/
      registry.js
      mock-household-adapter.js
      contract-parser-adapter.js
      product-lookup-adapter.js
    data/
      fixture-store.js
    schemas/
      source-quality.schema.json
      recommendation.schema.json
      consent.schema.json
      connector.schema.json
prototype.html
```

This structure can be introduced incrementally. The first implementation step should move code only when tests protect the existing EV calculation outputs: 8.40 EUR immediate cost, 3.24 EUR smart cost, and 5.16 EUR cash savings.

Future production-aligned structure, after prototype validation:

```text
app/
  page.tsx
  energy-check/page.tsx
  household/[householdId]/page.tsx
  api/
components/
  decision-workbench/
  trust/
  charts/
  assistant/
  consent/
lib/
  services/
  calculations/
  connectors/
  schemas/
```

## 4. Service Boundaries

| Service | Owns | Does not own | Next sprint action |
| --- | --- | --- | --- |
| `HouseholdProfileService` | Household metadata, Germany profile, installed systems, unit settings. | Live telemetry or calculations. | Wrap `household-profile.json` and expose normalized household context. |
| `ConsentService` | Connector scopes, read/control permissions, revocation state, consent copy. | Device execution or tariff math. | Add static consent state and route-level guards. |
| `ContractService` | Parsed contract fields, tariff rules, fixed fees, feed-in value, user confirmation. | Public market price fetching. | Promote `parseContractText` output into a typed contract result. |
| `ConnectorRetrievalService` | Connector registry, source refresh, normalized signals, provider health. | Optimizing plans or assistant prose. | Split connector status and refresh logic from lookup/parser adapters. |
| `ForecastService` | PV, load, weather, price horizon, confidence, freshness. | Final customer price without tariff normalization. | Keep fixture forecast shape but add validation and stale-state labels. |
| `ProductRecognitionService` | Product/model lookup, standard energy labels, confirmation requirement. | Treating labels as metered truth. | Preserve `user_confirmation_required` in every response. |
| `PowerCalculationService` | Convert kW/W and intervals into kWh. | Tariff policy or AI explanations. | Isolate interval power math from recommendation assembly. |
| `TariffCalculationService` | Final import/export prices by interval from contract rules. | Public market prices as customer prices. | Make final-price provenance explicit in every price interval. |
| `CostCalculationService` | Cost, bill forecast, base fee allocation, export credit. | Control decisions. | Keep bill forecast deterministic and auditable. |
| `OptimizerService` | EV smart charging, future use/store/sell/buy plan, constraints. | User consent and device execution. | Extend EV optimizer with explicit constraint output. |
| `RecommendationService` | User-facing decision payload and schedule summary. | Raw connector parsing. | Compose calculations, constraints, savings, and trust receipt into one response. |
| `TrustAuditService` | Calculation metadata, source quality, formula version, input snapshot. | Changing input values. | Make audit payload reusable across recommendation, assistant, and UI. |
| `AIOrchestrator` | Intent detection, tool selection, grounded answer assembly. | Inventing prices, savings, schedules, or consent. | Treat current scripted assistant as the first deterministic AI boundary. |
| `ControlExecutionService` | Future one-time or autopilot device commands. | Current sprint execution. | Define interfaces only; keep live control disabled. |

## 5. Data Contracts

The existing `docs/data-contract.md` remains the source of truth for fixture files. The next sprint should add machine-checkable schemas that mirror the documented contract.

Core entities:

| Entity | Required contract concerns |
| --- | --- |
| `HouseholdProfile` | `household_id`, locale, timezone, currency, location, system capabilities, demo use cases. |
| `TariffContract` | Final import price, low-price window, feed-in value, fixed fees, source documents, confirmation state. |
| `ForecastHorizon` | 24-hour interval horizon, granularity, PV forecast, load forecast, final customer price, confidence. |
| `DeviceState` | Observed time, EV required energy and deadline, wallbox limits, battery SOC, heat pump state, smart meter state. |
| `EvChargingRecommendation` | Decision, request, naive plan, smart plan, savings, trust, audit steps, calculation metadata. |
| `SourceQuality` | Field, source, status, unit, value, timestamp or interval, confidence. |
| `ConnectorStatus` | Connector id, mode, status, auth requirement, last observed time, output fields. |
| `ConsentState` | Scope, status, granted time, revoked time, control level, provider, data retention note. |
| `CalculationRun` | `calculated_at`, `valid_until`, `input_snapshot_id`, `formula_version`, source quality. |

Rules for all savings-bearing responses:

1. Include `calculated_at`, `valid_until`, `input_snapshot_id`, `formula_version`, and `source_quality`.
2. Use final customer tariff prices for user-facing cost calculations.
3. Label every value as Actual, Forecast, Estimate, User confirmed, or Fixture.
4. Keep solar cash cost and solar opportunity cost separate.
5. Keep public market reference data separate from final contract price.
6. Use `Europe/Berlin`, `EUR`, `kWh`, and `kW` consistently.

## 6. API Routes

Current routes to preserve:

| Route | Method | Owner | Contract |
| --- | --- | --- | --- |
| `/api/health` | GET | API boundary | Runtime status and formula version. |
| `/api/demo-state` | GET | Recommendation service | Combined household, contract, forecast, device state, connector status, recommendation, and audit data. |
| `/api/calculations/live` | GET | Calculation services | Power intervals, price intervals, bill forecast, source quality. |
| `/api/recommendations/ev-charging` | POST | Optimizer and recommendation services | Recalculate now-vs-smart plan from safe EV request overrides. |
| `/api/connectors/status` | GET | Connector retrieval service | Connector registry, mode, auth requirement, freshness, confidence. |
| `/api/connectors/refresh` | POST | Connector retrieval service | Normalized signals for calculation input. |
| `/api/products/lookup` | POST | Product recognition service | Candidate products and user-confirmation requirement. |
| `/api/contracts/parse` | POST | Contract service | Extracted tariff fields and confidence by field. |
| `/api/assistant/ask` | POST | AI orchestrator | Grounded answer, prompt contract, evidence, limitations. |

Recommended next routes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/consent/state` | GET | Return read/control permissions by connector and scope. |
| `/api/consent/grant` | POST | Demo grant for a named scope; no real OAuth yet. |
| `/api/consent/revoke` | POST | Revoke a named scope and mark dependent data as unavailable or stale. |
| `/api/audit/calculations/:inputSnapshotId` | GET | Return trust receipt and audit steps for a calculation run. |
| `/api/recommendations/current` | GET | Return the current best move without requiring the full demo-state payload. |
| `/api/control/ev-charging/preview` | POST | Validate a one-time EV control request and show expected effect. |
| `/api/control/ev-charging/confirm` | POST | Future command endpoint; next sprint should return disabled unless consent is explicit. |

API response state labels:

```text
checking
live
fallback
stale
estimate
needs_user_confirmation
consent_required
control_disabled
```

## 7. AI And Tool-Calling Boundaries

The assistant must be a grounded explanation layer over backend tools.

Allowed AI responsibilities:

1. Classify the user's intent.
2. Explain kWh, kW, EUR/kWh, solar opportunity cost, fixed fees, and savings formulas in plain English.
3. Summarize contract terms that were parsed and confirmed.
4. Explain a recommendation returned by the backend.
5. Name the evidence used for an answer.
6. Say when data is synthetic, estimated, stale, or missing.

Disallowed AI responsibilities:

1. Invent or modify prices, savings, device state, tariff rules, or deadlines.
2. Present public market prices as final contract prices.
3. Claim live device control when only advice is enabled.
4. Execute control actions.
5. Hide uncertainty or missing consent.
6. Use ungrounded motivational copy for financial claims.

Tool boundary for the next sprint:

```text
AIOrchestrator
  -> get_current_energy_state()
  -> get_current_recommendation()
  -> calculate_ev_charging_plan()
  -> calculate_bill_forecast()
  -> get_source_audit()
  -> parse_contract_terms()
  -> lookup_product_energy_profile()
```

The UI should send the user's question to `/api/assistant/ask`. The server should assemble a compact grounding snapshot from deterministic services, call tools as needed, and return:

```text
short_answer
explanation
calculation
recommendation
trust
evidence[]
limitations[]
prompt_contract.version
```

If a real LLM is added later, it must receive only the minimum normalized snapshot, never raw credentials or full private documents by default.

## 8. Consent And Control States

The platform should separate data access from device control.

| State | Meaning | User-facing label |
| --- | --- | --- |
| Estimate | User entered approximate home/system data only. | Estimate |
| Bill scan | User pasted or scanned contract/bill terms and confirmed key numbers. | Bill scan |
| Meter connected | User granted read access to meter or Home Assistant data. | Meter connected |
| Advice only | The app can recommend but cannot control devices. | Advice only |
| One-time approval | User approves one specific action after reviewing the plan. | Start this plan |
| Autopilot | User grants bounded automatic control rules. | Autopilot enabled |
| Revoked | User removed permission. | Disconnected |
| Stale | Previously connected data is too old for confident action. | Needs refresh |

Recommended consent scopes:

```text
contract:read
contract:write_confirmed_terms
meter:read
pv:read
battery:read
ev:read
wallbox:read
wallbox:control
heatpump:read
heatpump:control
product:lookup
assistant:use_grounding_snapshot
```

Control rules:

1. Default to `Advice only`.
2. Show `Start this plan` only after the backend returns a valid plan and consent state allows one-time approval.
3. Do not show `Autopilot enabled` unless a stored policy exists with scope, device, schedule limits, comfort constraints, and revocation path.
4. Log every future control preview and command with calculation metadata and consent metadata.
5. If consent is revoked, dependent recommendations must degrade to Estimate, Fallback, or Consent required.

## 9. Frontend Product Structure

The next UI iteration should keep the first screen focused on the decision, not a generic dashboard.

Primary sections:

| Section | Purpose | Backend dependency |
| --- | --- | --- |
| Decision Command | One best action, savings, deadline status, review action. | `/api/recommendations/current` or `/api/demo-state`. |
| kWh Routing Board | Use, Store, Sell, Buy allocation with kWh and source quality. | Future `energy_routing_plan[]`; EV plan today. |
| Price Timeline | Price, solar, load, EV deadline, and scheduled actions. | `power_intervals[]`, `price_intervals[]`, recommendation schedule. |
| Constraint Rail | EV need, departure, wallbox limit, battery reserve, tariff source. | `device_state`, contract, recommendation constraints. |
| Trust Receipt | Sources, timestamps, formulas, confidence, limitations. | `calculation`, `source_quality`, `audit_steps`. |
| Energy Companion Drawer | Grounded answers with evidence chips. | `/api/assistant/ask`. |
| Consent and Connector Panel | Data access, connector mode, confirmation requirement. | `/api/connectors/status`, `/api/consent/state`. |

Required UI states:

```text
Checking data
Using demo data
Using confirmed contract price
Using forecast
Needs user confirmation
Consent required
Advice only
Control disabled
Disconnected
```

All user-facing platform copy should be English. German market terms can appear when they are the exact contractual concept, for example `Arbeitspreis`, `Grundpreis`, `Einspeiseverguetung`, `MaLo-ID`, `iMSys`, and `DE-LU`, but they should be explained in English.

## 10. Rollout Milestones

### Milestone 1: Contract Lock And Schema Guardrails

Deliverables:

- JSON schemas for recommendation, source quality, connector status, and consent state.
- Tests that validate fixture payloads against the schemas.
- Clear fixture labels for Actual, Forecast, Estimate, User confirmed, and Fixture.

Exit criteria:

- Existing EV calculation tests still pass.
- Savings-bearing responses cannot omit calculation metadata.

### Milestone 2: Service Boundary Refactor

Deliverables:

- Split large domain logic into service-oriented modules.
- Keep public route behavior stable.
- Add a `RecommendationService` that composes calculation, audit, and decision copy.

Exit criteria:

- `/api/demo-state` and `/api/recommendations/ev-charging` return the same canonical numbers.
- Source quality appears consistently in recommendation, live calculation, and assistant responses.

### Milestone 3: Consent And Connector State

Deliverables:

- Static `ConsentService` and consent routes.
- Connector status includes scope, auth requirement, data freshness, and unavailable states.
- UI copy distinguishes Estimate, Bill scan, Meter connected, Advice only, and Autopilot.

Exit criteria:

- Revoking a demo scope visibly degrades related UI/API state.
- No route implies device control without explicit consent state.

### Milestone 4: Decision Workbench UI

Deliverables:

- First-screen decision layout with one best action.
- Trust receipt and source badges tied to backend metadata.
- Timeline and constraints sourced from API payloads.
- File-mode fallback remains usable.

Exit criteria:

- The UI shows `8.40 EUR`, `3.24 EUR`, and `5.16 EUR` from API data when served by `src/server.js`.
- The UI stays English-only and labels demo or fallback data honestly.

### Milestone 5: AI Orchestration Boundary

Deliverables:

- Tool contract for assistant grounding.
- Evidence chips for every answer.
- Refusal/fallback behavior for missing data or missing consent.
- Optional LLM adapter behind the current deterministic answer shape.

Exit criteria:

- Assistant answers never contain a money value absent from backend calculation output.
- Answers include a trust explanation and limitations.

### Milestone 6: Control Preview, Not Live Control

Deliverables:

- Disabled-by-default control preview endpoints.
- One-time control confirmation shape for future Wallbox integration.
- Audit log shape for future commands.

Exit criteria:

- Prototype can explain what would happen if the user starts the plan.
- No live device command is sent in this sprint.

## 11. Engineering Quality Gates

Functional gates:

- `npm test` passes.
- The prototype works at `http://127.0.0.1:4173`.
- File-mode fallback still shows canonical demo values.
- API-mode UI shows checking, live, and fallback states.

Data gates:

- Canonical EV values remain stable unless requirements change:
  - Required energy: 24.0 kWh
  - Current final import price: 0.35 EUR/kWh
  - Immediate cost: 8.40 EUR
  - Solar surplus: 6.0 kWh
  - Low-price grid energy: 18.0 kWh
  - Smart cash cost: 3.24 EUR
  - Cash savings: 5.16 EUR
- Every recommendation includes source quality and formula version.
- Forecast values are never labeled as actual meter readings.

AI gates:

- Assistant answers are grounded in returned API fields.
- Prompt contract version is present.
- Evidence is returned as structured data, not only prose.

Consent gates:

- Read permissions and control permissions are separate.
- Revoked state is represented.
- Autopilot remains future-state unless policy and consent are explicit.

## 12. Key Decisions For The Sprint

| Decision | Recommendation |
| --- | --- |
| Full framework migration | Defer. Keep the no-dependency Node prototype stable while extracting service boundaries. |
| `src/prototype` | Do not assume it exists. Create it only if the UI is split out of `prototype.html` in a later implementation task. |
| AI integration | Keep deterministic scripted assistant as the default; add real LLM only behind the same tool and evidence contract. |
| Solar opportunity cost | Keep cash savings as headline for the demo, but preserve economic savings including feed-in opportunity cost. |
| Control | Implement preview and consent states before any real command path. |
| Public data | Add connector shapes before live network dependencies; cache public data when added. |

## 13. Open Questions

1. Should the next sprint prioritize modularizing the UI out of `prototype.html`, or keep UI changes minimal and focus on schemas/services?
2. Should the first real external connector be Open-Meteo/PVGIS for low-risk public forecast data, or contract PDF/OCR for stronger savings trust?
3. Should the demo headline keep cash savings, or switch to economic savings including missed feed-in credit once the trust receipt is more mature?
4. What level of future control should be demoed: preview only, one-time approval mock, or disabled Autopilot concept?
