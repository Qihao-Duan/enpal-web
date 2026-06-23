const assert = require("assert");
const path = require("path");
const { Readable } = require("stream");
const { createApiHandlers } = require("../packages/energy-engine/api-handlers");

const rootDir = path.resolve(__dirname, "..");
const handleApi = createApiHandlers(rootDir);

function makeRequest(method, body) {
  const chunks = body === undefined ? [] : [JSON.stringify(body)];
  const req = Readable.from(chunks);
  req.method = method;
  req.headers = {
    accept: "application/json",
    "content-type": "application/json"
  };
  return req;
}

function callApi(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const req = makeRequest(method, body);
    const res = {
      statusCode: null,
      headers: null,
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
      },
      end(payload) {
        try {
          resolve({
            status: this.statusCode,
            headers: this.headers,
            payload: payload ? JSON.parse(payload) : {}
          });
        } catch (error) {
          reject(error);
        }
      }
    };
    const url = new URL(pathname, "http://localhost");
    Promise.resolve(handleApi(req, res, url)).catch(reject);
  });
}

(async () => {
  const current = await callApi("GET", "/api/plan/current");
  assert.strictEqual(current.status, 200);
  assert.strictEqual(current.payload.current_plan_tier, "premium");
  assert.strictEqual(current.payload.tiers.basic.features.solar_export_optimizer.status, "locked");

  const premium = await callApi("POST", "/api/plans/optimize", { plan_tier: "premium" });
  assert.strictEqual(premium.status, 200);
  assert.strictEqual(premium.payload.status, "optimized");
  assert.strictEqual(premium.payload.plan_tier, "premium");
  assert.strictEqual(premium.payload.recommendation.savings.cash_savings_eur, 5.16);
  assert.strictEqual(premium.payload.energy_routing.summary.store_kwh, 17.2);
  assert.ok(premium.payload.profile_readiness.readiness_percent >= 60);
  assert.ok(premium.payload.home_devices.device_count >= 4);

  const factoryPremium = await callApi("POST", "/api/plans/optimize", {
    plan_tier: "premium",
    site_type: "factory_demo",
    profile_key: "munich"
  });
  assert.strictEqual(factoryPremium.status, 200);
  assert.strictEqual(factoryPremium.payload.status, "optimized");
  assert.strictEqual(factoryPremium.payload.site_context.site_type, "factory_demo");
  assert.strictEqual(factoryPremium.payload.summary.premium_demo_value_eur, 876.73);
  assert.ok(factoryPremium.payload.summary.premium_demo_value_eur > factoryPremium.payload.summary.basic_demo_value_eur * 10);
  assert.strictEqual(factoryPremium.payload.profile_readiness.site_id, "factory_de_munich_001");
  assert.ok(factoryPremium.payload.home_devices.devices.some((item) => item.equipment_id === "forklift_fleet"));
  assert.ok(factoryPremium.payload.limitations.some((item) => /not measured profit/i.test(item)));

  const basic = await callApi("POST", "/api/plans/optimize", {
    plan_tier: "basic",
    ev_request: { required_energy_kwh: 12 }
  });
  assert.strictEqual(basic.status, 200);
  assert.strictEqual(basic.payload.plan_tier, "basic");
  assert.strictEqual(basic.payload.recommendation.ev_request.required_energy_kwh, 12);
  assert.strictEqual(basic.payload.plan_access.features.solar_export_optimizer.status, "locked");

  const readiness = await callApi("GET", "/api/profile/readiness");
  assert.strictEqual(readiness.status, 200);
  assert.ok(readiness.payload.checks.some((item) => item.id === "solar_forecast"));

  const scan = await callApi("POST", "/api/products/scan", {
    text: "Bosch Serie 6 dishwasher 1.05 kWh per cycle 150 min"
  });
  assert.strictEqual(scan.status, 200);
  assert.strictEqual(scan.payload.profile.normalized_energy_profile.cycle_kwh, 1.05);

  const upload = await callApi("POST", "/api/contracts/upload", {
    file_name: "contract.pdf",
    text: "Final import price 29 ct/kWh. Basic fee 15 EUR/month."
  });
  assert.strictEqual(upload.status, 200);
  assert.strictEqual(upload.payload.parsed_terms.current_import_price_eur_per_kwh, 0.29);

  const confirm = await callApi("POST", `/api/contracts/${upload.payload.contract_id}/confirm`, {
    parsed_terms: upload.payload.parsed_terms
  });
  assert.strictEqual(confirm.status, 200);
  assert.strictEqual(confirm.payload.status, "confirmed_source_of_truth_demo");

  const audit = await callApi("GET", `/api/audit/calculations/${encodeURIComponent(premium.payload.audit.input_snapshot_id)}`);
  assert.strictEqual(audit.status, 200);
  assert.strictEqual(audit.payload.matched_current_snapshot, true);
  assert.ok(Array.isArray(audit.payload.audit_steps));

  console.log("api handler tests passed");
})().catch((error) => {
  throw error;
});
