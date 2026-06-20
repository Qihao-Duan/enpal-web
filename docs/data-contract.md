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
| `POST /api/contracts/parse` | Rule parser + `tariff-contract.json` fallback | Extracts calculation terms from pasted contract text, such as import price, monthly fee, feed-in credit, and notice period. |

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
| Contract parsing | Rule-based text parser with fixture fallback | OCR/PDF parser plus user confirmation UI |

The frontend panel "Automatic data retrieval" calls these endpoints directly, making the backend interaction visible without claiming that private user accounts are already connected.

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
