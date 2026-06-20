# Enpal Smart Energy Companion Data Contract

This contract describes the synthetic backend data used by the Enpal Smart Energy Companion prototype. The current files are English-language mock data for a Germany household and are designed to support the EV smart charging demo: required kWh, solar surplus, low-price grid window, naive cost, smart cost, savings, and trust/audit fields.

All data in `data/` is synthetic. It should be treated as backend fixture data, not as a real customer record, real tariff, or real market price.

## Files

| File | Purpose | Primary consumer |
| --- | --- | --- |
| `data/household-profile.json` | Stable household, location, system, and unit metadata. | App bootstrap, personalization, connector routing |
| `data/tariff-contract.json` | Parsed contract and tariff rules, including dynamic import pricing and feed-in credit. | Cost engine, tariff explanation, contract summary |
| `data/forecasts-24h.json` | Hourly 24-hour price, PV, household load, and EV-usable solar surplus forecast. | Recommendation engine, charts, timeline |
| `data/device-state.json` | Current mock actual state for PV, battery, EV, wallbox, heat pump, and smart meter. | Live dashboard, EV charging request |
| `data/ev-charging-recommendation.json` | Backend-calculated recommendation, schedule, savings, kWh explanation, and audit trail. | Today’s Best Move, Why Trust This, chat grounding |
| `data/energy-routing-plan.json` | Planned use/store/sell/buy routing output for the Decision Workbench. | kWh routing board, price timeline, Trust Receipt |

Runtime appliance telemetry and user-added devices are not committed to Git. The prototype stores same-day appliance readings in `data/runtime/appliance-telemetry.json` and confirmed device profiles in `data/runtime/home-devices.json`, simulating the production time-series database plus device registry.

## Contract Principles

1. Contract prices beat public market prices. Public day-ahead or intraday prices are inputs, but customer-facing cost calculations must use the parsed tariff's final import price.
2. AI explains backend calculations. The assistant can translate the result into plain language, but it must not invent prices, savings, device states, or contract terms.
3. Every money figure needs provenance. Recommendation payloads include source fields, timestamps, units, and calculation steps.
4. Forecasts must be labeled as forecasts. Actual meter/device data, contract terms, and predicted PV/price/load data are separate statuses.
5. Solar can have two cost views. For homeowner cash-flow UX, solar surplus can be shown as zero out-of-pocket cost. For economic audit, include the missed feed-in credit as opportunity cost.

## Shared Fields

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | string | Fixture contract version, currently `0.1.0`. |
| `household_id` | string | Stable household key used to join files. |
| `profile_type` | string | `synthetic_demo` for all current fixtures. |
| `timezone` | string | IANA timezone, expected `Europe/Berlin`. |
| `currency` | string | `EUR` where monetary values are present. |
| timestamp fields | ISO 8601 string | Include timezone offset, for example `2026-06-20T10:42:00+02:00`. |

## Household Profile Schema

`household-profile.json` is stable context for the demo household.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `customer` | object | Display name, language, consent status, and synthetic privacy note. |
| `home` | object | Germany location, home type, occupants, and annual estimates. |
| `energy_system` | object | Installed PV, battery, EV, wallbox, heat pump, and smart meter capabilities. |
| `demo_use_cases` | string[] | Product flows this profile supports. |

Important nested fields:

| Field | Type | Description |
| --- | --- | --- |
| `energy_system.pv.capacity_kwp` | number | Installed solar capacity. |
| `energy_system.battery.usable_capacity_kwh` | number | Usable battery energy. |
| `energy_system.ev.usable_battery_capacity_kwh` | number | EV battery size used to derive required kWh. |
| `energy_system.wallbox.max_power_kw` | number | Wallbox charging constraint. |
| `energy_system.smart_meter.granularity` | string | Expected interval data resolution. |

## Tariff And Contract Schema

`tariff-contract.json` represents the result of a contract/tariff parser. It contains enough pricing data for a backend cost engine.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `supplier` | object | Demo supplier identity. |
| `contract` | object | Product name, term, billing period, and metering requirement. |
| `metering` | object | Synthetic meter and settlement identifiers. |
| `price_rules` | object | Final price formula and tariff constants. |
| `ev_charging_demo_terms` | object | Low-price window and solar cost basis for the EV demo. |
| `source_documents` | object[] | Contract parser provenance. |

Important nested fields:

| Field | Type | Description |
| --- | --- | --- |
| `price_rules.current_import_price_eur_per_kwh` | number | Used for naive immediate charging cost. |
| `price_rules.standard_tariff_benchmark_eur_per_kwh` | number | Comparison baseline for simple UX. |
| `price_rules.feed_in_credit_eur_per_kwh` | number | Missed export revenue when solar is self-consumed. |
| `ev_charging_demo_terms.low_price_window` | object | Start, end, and final low import price. |

## Forecast Schema

`forecasts-24h.json` is an hourly horizon from `2026-06-20T10:00:00+02:00` to `2026-06-21T10:00:00+02:00`.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `forecast_id` | string | Unique forecast run identifier. |
| `generated_at` | string | Forecast generation time. |
| `granularity` | string | ISO 8601 duration, currently `PT1H`. |
| `horizon` | object | Inclusive start and exclusive end. |
| `summary` | object | Precomputed values for fast UI rendering. |
| `sources` | object[] | Forecast source metadata. |
| `hours` | object[] | Exactly 24 hourly records. |

Required hourly fields:

| Field | Type | Description |
| --- | --- | --- |
| `hour_start` | string | Local timestamp for the hour. |
| `grid_import_price_eur_per_kwh` | number | Customer final import price after tariff rules. |
| `solar_export_price_eur_per_kwh` | number | Feed-in credit for exported PV. |
| `pv_generation_forecast_kwh` | number | Expected PV production in this hour. |
| `household_load_forecast_kwh_excluding_ev` | number | Household load before EV charging. |
| `battery_charge_reserved_kwh` | number | Solar reserved for battery or other household constraints. |
| `ev_usable_solar_surplus_kwh` | number | Solar surplus available for EV charging. |
| `weather_summary` | string | Human-readable forecast label. |
| `confidence` | number | 0-1 confidence score. |

For the EV demo, the solar surplus fields sum to `6.0 kWh`, and the low-price window offers `18.0 kWh` of grid charging in the planned schedule.

## Device State Schema

`device-state.json` is the mock actual state at `2026-06-20T10:42:00+02:00`.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `observed_at` | string | Time the device state was observed. |
| `source` | object | Mock adapter metadata. |
| `current_power_flow_kw` | object | Current PV, load, battery, EV, import, and export power. |
| `battery` | object | Current battery SOC and power constraints. |
| `ev` | object | Plug state, SOC, target, required kWh, and deadline. |
| `wallbox` | object | Charging power and smart charging capability. |
| `heat_pump` | object | Current comfort state and shiftability. |
| `smart_meter` | object | Latest interval import/export values. |

The EV fields drive the demo request:

| Field | Value | Use |
| --- | --- | --- |
| `ev.required_energy_kwh` | `24.0` | Required energy before departure. |
| `ev.departure_deadline` | `2026-06-21T08:00:00+02:00` | Schedule constraint. |
| `wallbox.max_power_kw` | `11` | Maximum charging rate. |

## Recommendation And Audit Schema

`ev-charging-recommendation.json` is the backend output the UI and AI layer should consume.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `decision` | object | User-facing recommendation, action, deadline status, and confidence. |
| `ev_request` | object | Normalized charging request. |
| `naive_plan` | object | Immediate-charge baseline. |
| `smart_plan` | object | Optimized schedule and cost. |
| `savings` | object | Cash and economic savings metrics. |
| `kwh_explanation` | object | Plain-language kWh explanation. |
| `trust` | object | Why Trust This source trail and limitations. |
| `audit_steps` | object[] | Ordered calculation trace. |

EV demo invariants:

| Metric | Value |
| --- | --- |
| Required EV energy | `24.0 kWh` |
| Current import price | `0.35 EUR/kWh` |
| Naive cost | `8.40 EUR` |
| Solar surplus used | `6.0 kWh` |
| Low-price grid energy | `18.0 kWh` |
| Low-price import price | `0.18 EUR/kWh` |
| Smart cash cost | `3.24 EUR` |
| Cash savings | `5.16 EUR` |
| Economic cost including missed feed-in credit | `3.73 EUR` |
| Economic savings | `4.67 EUR` |

The UI can use `savings.headline_metric` to decide whether to show cash savings or economic savings. For this prototype it is set to `cash_savings_eur`, matching the demo narrative.

## Energy Routing Plan Schema

`energy-routing-plan.json` is the planned backend output for the Decision Workbench. It generalizes the EV charging demo from "charge now vs smart charge" into a route allocation problem: each flexible kWh should be assigned to use, store, sell, or buy.

Required top-level fields:

| Field | Type | Description |
| --- | --- | --- |
| `routing_plan_id` | string | Stable identifier for the calculation run. |
| `created_at` | string | Calculation timestamp. |
| `formula_version` | string | Routing formula version. |
| `horizon` | object | Start and end timestamps for the plan. |
| `headline_decision` | object | User-facing recommendation and primary action. |
| `routes` | object[] | Use/store/sell/buy allocation rows. |
| `timeline` | object[] | Time-indexed routing, price, solar, and device constraint entries. |
| `constraints` | object[] | EV, wallbox, battery, heat pump, comfort, and consent constraints. |
| `source_quality` | object[] | Source, status, unit, value, confidence, and freshness records. |
| `audit_steps` | object[] | Ordered calculation trace for Trust Receipt. |

Route row shape:

```ts
type EnergyRoute = {
  route: "use" | "store" | "sell" | "buy"
  label: string
  energy_kwh: number
  cash_cost_eur: number
  opportunity_cost_eur: number
  effective_cost_eur: number
  price_basis: "contract" | "feed_in" | "forecast" | "battery_model"
  reason: string
  source_status: "actual" | "forecast" | "estimate" | "user_confirmed_mock"
  confidence: number
}
```

Decision Workbench invariants:

| Invariant | Reason |
| --- | --- |
| Every route must include `energy_kwh`, `effective_cost_eur`, and `reason`. | The UI must explain why a kWh was routed there. |
| `sell` uses export/feed-in revenue as the value basis. | Solar self-use has an opportunity cost. |
| `store` includes battery efficiency and degradation cost. | Stored energy is not free energy. |
| `buy` uses the user's final import price, not raw market price. | Public market data is not a bill. |
| Constraints are displayed next to the recommendation. | The optimizer should not look like a price-only black box. |
| `source_quality[]` is mandatory for all money-bearing outputs. | Trust Receipt needs auditability. |

## Realtime Appliance Telemetry Schema

The live backend should read same-day appliance consumption from read-only sources such as smart plugs, Home Assistant, wallbox/OCPP telemetry, heat-pump cloud APIs, inverter consumption channels, and smart-meter submetering when available. The goal is to replace generic product estimates with actual interval kWh before the optimizer ranks flexible loads.

Production storage recommendation:

| Store | Purpose |
| --- | --- |
| PostgreSQL | Household, device registry, consent scopes, connector accounts, product metadata. |
| TimescaleDB hypertables | `appliance_telemetry_readings`, `meter_readings`, `power_intervals`, `price_intervals`, `battery_states`. |
| Object storage | Contract PDFs, bills, energy-label photos, product manuals, OCR artifacts. |

Prototype storage:

| File | Status | Notes |
| --- | --- | --- |
| `data/runtime/appliance-telemetry.json` | Local runtime store, gitignored | Simulates same-day appliance interval readings for API and optimizer integration. |
| `data/runtime/home-devices.json` | Local runtime store, gitignored | Stores user-added devices created from product lookup/profile confirmation. |

Reading shape:

```ts
type ApplianceTelemetryReading = {
  household_id: string
  device_id: string
  device_type: "ev" | "wallbox" | "dishwasher" | "heat_pump" | "battery" | string
  interval_start: string
  interval_end: string
  observed_at: string
  energy_kwh: number
  power_kw?: number
  flexible_load: boolean
  source: {
    name: string
    adapter: "home_assistant" | "ocpp" | "smart_plug" | "inverter_cloud" | "prototype_ingest" | string
    status: "actual" | "estimated" | "stale"
    confidence: number
  }
}
```

Optimizer input priority:

| Priority | Input source | Meaning |
| --- | --- | --- |
| 1 | `actual` appliance interval kWh | Use directly for today's load ranking and bill attribution. |
| 2 | Smart plug / submeter measured profile | Use for device-specific baseline and flexible-window learning. |
| 3 | User-confirmed appliance model or usage routine | Use when live telemetry is missing. |
| 4 | Product label / catalog estimate | Use only as a starting estimate with visible confidence. |

The optimizer receives `optimizer_inputs.actual_device_energy_kwh`, `flexible_load_actual_kwh`, `baseline_load_actual_kwh`, and `top_device_today`. Every value must remain source-labeled so the Trust Receipt can explain whether the plan used actual telemetry or estimates.

## Implemented Prototype Backend Endpoints

The current no-dependency Node backend exposes a thin mock API from `src/server.js`. The API recomputes recommendation values from the fixture inputs rather than treating `ev-charging-recommendation.json` as trusted user input.

| Endpoint | Backing data | Notes |
| --- | --- | --- |
| `GET /api/health` | Runtime only | Returns service status and formula version. |
| `GET /api/demo-state` | All fixture files + calculation engine | Combined payload for the prototype UI. Includes household, contract, forecast, device state, recommendation, calculation metadata, and source quality. |
| `GET /api/calculations/live` | Forecast, contract, device state | Returns `power_intervals`, `price_intervals`, `bill_forecast`, calculation metadata, and source quality. |
| `POST /api/recommendations/ev-charging` | Contract, forecast, device state | Recomputes EV charging recommendation. Accepts safe request overrides such as `required_energy_kwh`; contract prices still come from fixtures. |
| `GET /api/connectors/status` | Connector registry + fixtures | Lists connector-ready adapters for tariff, solar/weather, device telemetry, contract parsing, and product lookup. |
| `POST /api/connectors/refresh` | Connector registry + fixtures | Returns normalized signals that would feed calculations after a real external refresh. Current mode is `external_ready_fixture_adapters`. |
| `POST /api/products/lookup` | `data/product-catalog.json` | Finds candidate appliance/EV models from model text or scan-derived labels. Results require user confirmation before bill forecasts. |
| `POST /api/products/profile` | Product catalog + user text/OCR/manual fields + tariff forecast | Builds a normalized product usage profile with kWh formula, cost now vs smart-window cost, AI planning context, and photo-recognition adapter design. |
| `GET /api/devices` | System fixture devices + `data/runtime/home-devices.json` | Returns the canonical home device registry used by the Home Devices UI. |
| `POST /api/devices` | Product profile / manual device payload + tariff forecast | Confirms a product profile into a home device, stores it in the runtime registry, and returns schedule-ready advice. |
| `POST /api/contracts/parse` | Rule parser + `tariff-contract.json` fallback | Extracts calculation terms from pasted contract text, such as import price, monthly fee, feed-in credit, and notice period. |
| `GET /api/energy-routing/plan` | Forecast, contract, device state, battery state, routing engine | Returns use/store/sell/buy allocation, opportunity costs, constraints, source quality, and Trust Receipt audit steps. |
| `GET /api/appliance-telemetry/today` | `data/runtime/appliance-telemetry.json` | Returns today's per-device actual kWh, flexible-load totals, source quality, and optimizer input snapshot. |
| `POST /api/appliance-telemetry/readings` | Request body + local runtime store | Ingests one or more appliance interval readings. Accepts `energy_kwh` directly or derives it from `power_kw * interval_hours`. |

Savings-bearing API responses must include:

| Field | Purpose |
| --- | --- |
| `calculated_at` | Timestamp for the calculation run. |
| `valid_until` | End of the forecast or validity window. |
| `input_snapshot_id` | Stable join key for the fixture inputs used in the run. |
| `formula_version` | Calculation engine version, currently `energy-engine.v0.1.0`. |
| `source_quality[]` | Source, status, unit, value, and confidence records for audit display. |

The prototype server also serves `prototype.html`, `/data/`, and `/docs/` read-only on the same origin, so the browser can fetch API data without CORS complexity.

## Implemented Retrieval Layer

The current retrieval layer is connector-ready rather than fully live. It uses deterministic fixture adapters so the UI and calculation engine can develop against the same response shape that real integrations should use later.

| Capability | Current implementation | Production replacement |
| --- | --- | --- |
| Connector status | `makeConnectorStatus()` in `src/lib/connectors.js` | Connector registry with OAuth/consent state and health checks |
| Source refresh | `refreshConnectors()` returns normalized fixture signals | Scheduled and on-demand provider fetch jobs |
| Product lookup | Demo catalog in `data/product-catalog.json` | EPREL, manufacturer manuals, retailer specs, barcode/OCR |
| Product usage profile | `buildProductUsageProfile()` merges catalog match, natural text, OCR text, and user-confirmed power fields | EPREL QR/API, manufacturer manuals, retailer specs, barcode decoder, OCR/vision model |
| Contract parsing | Rule-based text parser with fixture fallback | OCR/PDF parser plus user confirmation UI |

The frontend panel "Automatic data retrieval" calls these endpoints directly, making the backend interaction visible without claiming that private user accounts are already connected.

### Product Usage Profile Contract

`POST /api/products/profile` is the entry point for user-added appliances. It accepts structured fields when the UI has them, but also supports natural text so a homeowner can type what they see on a label or manual.

Input fields:

| Field | Example | Purpose |
| --- | --- | --- |
| `query` | `Bosch Serie 6 dishwasher` | Model lookup against catalog or external providers. |
| `category` | `dishwasher` | Optional hint when the model text is ambiguous. |
| `natural_text` | `1.05 kWh per cycle, 150 min, 5 cycles per week` | Human-entered usage details. |
| `photo_ocr_text` | `Energy label: 0.47 kWh/cycle` | Text extracted by a future camera/OCR pipeline. |
| `product_details.cycle_kwh` | `1.05` | User-confirmed energy per run. |
| `product_details.power_kw` + `runtime_minutes` | `1.2`, `45` | Converts rated power into `energy_kwh = power_kw x runtime_hours`. |

Output fields:

| Field | Meaning |
| --- | --- |
| `normalized_energy_profile` | Category, kWh per run, weekly kWh, flexible-load flag, and the formula used. |
| `optimization_preview` | Cost now, cost in the cheapest suitable window, estimated saving per run, and user-experience guardrail. |
| `ai_planning_context` | Prompt facts the conversational layer may use; it must not invent missing specs. |
| `source_quality[]` | Whether values came from a catalog, OCR/user text, or user-confirmed input. Missing energy remains `missing_energy_input`, not `0 kWh`. |
| `external_retrieval_design` | Production source plan: EPREL/energy label, manufacturer manuals, retailer specs, barcode/QR, OCR, and vision extraction. |

### Home Device Registry Contract

`POST /api/devices` is the missing confirmation step after lookup/profile. It turns a candidate product into a household device that the UI can show and the planner can consider.

| Input | Meaning |
| --- | --- |
| `product_profile` | Preferred payload from `/api/products/profile`. |
| `category`, `model`, `energy_profile` | Manual fallback when no profile endpoint is available. |
| `energy_profile.cycle_kwh` | Required before cost or schedule advice can be calculated. |
| `energy_profile.power_kw` + `runtime_minutes` | Converted into kWh when cycle kWh is missing. |

| Output | Meaning |
| --- | --- |
| `device` | Canonical home device with id, category, model, energy profile, data quality, and advice. |
| `device_registry` | Full list of system and user-added devices for the Home Devices panel. |
| `device.advice` | Cost now, smart-window cost, saving per run, formula, and recommendation. |

Unknown energy remains `needs_energy_confirmation`; it appears in Home Devices but does not become a money-saving schedule card until a kWh value is confirmed.

## Future Connectors

The mock data is intentionally shaped to be replaced one source at a time.

| Domain | Future connector | Replaces or enriches |
| --- | --- | --- |
| Contract and bills | Contract PDF parser, supplier API, Enpal customer contract system | `tariff-contract.json` |
| Market price | SMARD, ENTSO-E Transparency Platform, commercial EPEX feed | Forecast price fields before tariff finalization |
| Weather | Open-Meteo, DWD Open Data | Weather summary and PV model inputs |
| PV forecast | PVGIS, inverter forecast APIs, Enpal PV model | `pv_generation_forecast_kwh` |
| Smart meter | iMSys/MSB API, supplier meter API, pulse reader, Home Assistant | `smart_meter`, import/export actuals |
| PV and battery telemetry | SolarEdge, Enphase, SMA, Fronius, Enpal device cloud | Current PV, battery SOC, power flow |
| EV and wallbox | OCPP, wallbox vendor API, vehicle API, Home Assistant | Plug state, max power, SOC, target, deadline |
| Heat pump | Vendor API, SG Ready gateway, Home Assistant | Heat pump load and shiftability |
| Registry validation | Marktstammdatenregister | PV and battery capacity sanity checks |

## Implementation Notes

The recommendation service should compute `ev-charging-recommendation.json` from the other four files rather than treating it as user input. A production service should keep raw connector payloads, normalized records, and calculation outputs separately so each user-facing number can be audited.

For chat grounding, pass only the normalized recommendation plus the relevant `trust.source_of_truth` fields to the LLM. This keeps the answer concise and reduces the risk that the AI confuses public market references with the customer's final contract price.
