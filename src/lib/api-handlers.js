const { loadFixtures } = require("./fixture-store");
const { answerEnergyQuestion } = require("./assistant");
const {
  calculateEvRecommendation,
  calculateLiveState
} = require("./energy-calculations");
const {
  calculateEnergyRouting,
  loadEnergyRoutingPlan
} = require("./energy-routing");
const {
  getTodayApplianceTelemetry,
  ingestApplianceTelemetry
} = require("./appliance-telemetry-store");
const {
  addHomeDevice,
  listHomeDevices
} = require("./home-device-store");
const {
  buildProductUsageProfile,
  lookupProduct,
  makeConnectorStatus,
  parseContractText,
  refreshConnectors
} = require("./connectors");
const {
  buildContractUpload,
  buildDeviceReadiness,
  buildProfileCurrent,
  buildProfileReadiness,
  calculateOptimizationPlan,
  confirmContract,
  findDevice,
  getCurrentPlan,
  scanProduct
} = require("./energy-plans");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
  });
  res.end(body);
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function createApiHandlers(rootDir) {
  return async function handleApi(req, res, url) {
    if (req.method === "OPTIONS") {
      return sendJson(res, 204, {});
    }

    try {
      const fixtures = loadFixtures(rootDir);

      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          service: "enpal-smart-energy-companion-api",
          version: "0.1.0",
          formula_version: "energy-engine.v0.1.0"
        });
      }

      if (req.method === "GET" && url.pathname === "/api/calculations/live") {
        return sendJson(res, 200, calculateLiveState(fixtures));
      }

      if (req.method === "GET" && url.pathname === "/api/energy-routing/plan") {
        const routingPlan = loadEnergyRoutingPlan(rootDir);
        const applianceTelemetry = getTodayApplianceTelemetry(rootDir, fixtures, {
          date: url.searchParams.get("date") || undefined
        });
        return sendJson(res, 200, calculateEnergyRouting(fixtures, {
          routingPlan,
          applianceTelemetry
        }));
      }

      if (req.method === "GET" && url.pathname === "/api/plan/current") {
        return sendJson(res, 200, getCurrentPlan(fixtures));
      }

      if (req.method === "POST" && (url.pathname === "/api/plans/optimize" || url.pathname === "/api/plan/simulate")) {
        const body = await readRequestJson(req);
        const routingPlan = loadEnergyRoutingPlan(rootDir);
        const applianceTelemetry = getTodayApplianceTelemetry(rootDir, fixtures, {
          date: body.date || url.searchParams.get("date") || undefined
        });
        const optimizedPlan = calculateOptimizationPlan(fixtures, body, {
          rootDir,
          routingPlan,
          applianceTelemetry
        });
        const homeDevices = listHomeDevices(rootDir, fixtures);
        return sendJson(res, 200, {
          ...optimizedPlan,
          status: url.pathname === "/api/plan/simulate" ? "simulated" : "optimized",
          profile_readiness: buildProfileReadiness(fixtures, homeDevices),
          home_devices: homeDevices
        });
      }

      if (req.method === "GET" && url.pathname === "/api/profile/current") {
        return sendJson(res, 200, buildProfileCurrent(fixtures));
      }

      if (req.method === "PATCH" && url.pathname === "/api/profile/current") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, buildProfileCurrent(fixtures, body));
      }

      if (req.method === "GET" && url.pathname === "/api/profile/readiness") {
        return sendJson(res, 200, buildProfileReadiness(fixtures, listHomeDevices(rootDir, fixtures)));
      }

      if (req.method === "GET" && url.pathname === "/api/appliance-telemetry/today") {
        return sendJson(res, 200, getTodayApplianceTelemetry(rootDir, fixtures, {
          date: url.searchParams.get("date") || undefined
        }));
      }

      if (req.method === "POST" && url.pathname === "/api/appliance-telemetry/readings") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, ingestApplianceTelemetry(rootDir, fixtures, body));
      }

      if (req.method === "GET" && url.pathname === "/api/devices") {
        return sendJson(res, 200, listHomeDevices(rootDir, fixtures));
      }

      if (req.method === "POST" && url.pathname === "/api/devices") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, addHomeDevice(rootDir, fixtures, body));
      }

      if (req.method === "GET" && url.pathname === "/api/connectors/status") {
        return sendJson(res, 200, makeConnectorStatus(fixtures));
      }

      if (req.method === "POST" && url.pathname === "/api/connectors/refresh") {
        return sendJson(res, 200, refreshConnectors(fixtures));
      }

      if (req.method === "POST" && url.pathname === "/api/products/lookup") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, lookupProduct(fixtures, body));
      }

      if (req.method === "POST" && url.pathname === "/api/products/profile") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, buildProductUsageProfile(fixtures, body));
      }

      if (req.method === "POST" && url.pathname === "/api/products/scan") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, scanProduct(fixtures, body));
      }

      if (req.method === "POST" && url.pathname === "/api/contracts/parse") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, parseContractText(fixtures, body));
      }

      if (req.method === "POST" && url.pathname === "/api/contracts/upload") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, buildContractUpload(fixtures, body));
      }

      const contractConfirmMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/confirm$/);
      if (req.method === "POST" && contractConfirmMatch) {
        const body = await readRequestJson(req);
        return sendJson(res, 200, confirmContract(fixtures, contractConfirmMatch[1], body));
      }

      const deviceReadinessMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/readiness$/);
      if (req.method === "GET" && deviceReadinessMatch) {
        const registry = listHomeDevices(rootDir, fixtures);
        const device = findDevice(registry, decodeURIComponent(deviceReadinessMatch[1]));
        return sendJson(res, device ? 200 : 404, buildDeviceReadiness(device));
      }

      const deviceConfirmMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/confirm$/);
      if (req.method === "POST" && deviceConfirmMatch) {
        const body = await readRequestJson(req);
        const registry = listHomeDevices(rootDir, fixtures);
        const device = findDevice(registry, decodeURIComponent(deviceConfirmMatch[1]));
        if (!device) return sendJson(res, 404, buildDeviceReadiness(null));
        const confirmedDevice = {
          ...device,
          user_confirmation_required: false,
          data_quality: "User confirmed",
          confirmed_at: fixtures.forecast.generated_at || new Date().toISOString(),
          confirmation_note: body.confirmation_note || "Confirmed in demo API."
        };
        return sendJson(res, 200, {
          schema_version: "0.1.0",
          status: "confirmed_for_planning_demo",
          device: confirmedDevice,
          readiness: buildDeviceReadiness(confirmedDevice)
        });
      }

      const auditMatch = url.pathname.match(/^\/api\/audit\/calculations\/([^/]+)$/);
      if (req.method === "GET" && auditMatch) {
        const routingPlan = loadEnergyRoutingPlan(rootDir);
        const applianceTelemetry = getTodayApplianceTelemetry(rootDir, fixtures);
        const optimizedPlan = calculateOptimizationPlan(fixtures, {
          plan_tier: url.searchParams.get("plan_tier") || "premium"
        }, {
          rootDir,
          routingPlan,
          applianceTelemetry
        });
        return sendJson(res, 200, {
          ...optimizedPlan.audit,
          requested_snapshot_id: decodeURIComponent(auditMatch[1]),
          matched_current_snapshot: optimizedPlan.audit.input_snapshot_id === decodeURIComponent(auditMatch[1])
        });
      }

      if (req.method === "POST" && url.pathname === "/api/assistant/ask") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, answerEnergyQuestion(fixtures, body));
      }

      if (req.method === "GET" && url.pathname === "/api/demo-state") {
        const live = calculateLiveState(fixtures);
        const recommendation = calculateEvRecommendation(fixtures);
        const connectorStatus = makeConnectorStatus(fixtures);
        const routingPlan = loadEnergyRoutingPlan(rootDir);
        const applianceTelemetry = getTodayApplianceTelemetry(rootDir, fixtures);
        const homeDevices = listHomeDevices(rootDir, fixtures);
        const energyRouting = calculateEnergyRouting(fixtures, {
          routingPlan,
          applianceTelemetry
        });
        return sendJson(res, 200, {
          household: fixtures.household,
          contract: fixtures.contract,
          forecast: fixtures.forecast,
          device_state: fixtures.deviceState,
          appliance_telemetry_today: applianceTelemetry,
          connectors: connectorStatus,
          home_devices: homeDevices,
          recommendation,
          energy_routing: energyRouting,
          calculation: recommendation.calculation,
          source_quality: recommendation.calculation.source_quality,
          live_calculation: live
        });
      }

      if (req.method === "POST" && url.pathname === "/api/recommendations/ev-charging") {
        const body = await readRequestJson(req);
        const overrides = body.ev_request || body;
        return sendJson(res, 200, calculateEvRecommendation(fixtures, overrides));
      }

      return sendJson(res, 404, {
        error: "API route not found.",
        path: url.pathname
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.message || "Internal server error."
      });
    }
  };
}

module.exports = {
  createApiHandlers,
  sendJson
};
