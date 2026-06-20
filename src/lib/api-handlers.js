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
  lookupProduct,
  makeConnectorStatus,
  parseContractText,
  refreshConnectors
} = require("./connectors");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
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
        return sendJson(res, 200, calculateEnergyRouting(fixtures, { routingPlan }));
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

      if (req.method === "POST" && url.pathname === "/api/contracts/parse") {
        const body = await readRequestJson(req);
        return sendJson(res, 200, parseContractText(fixtures, body));
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
        const energyRouting = calculateEnergyRouting(fixtures, { routingPlan });
        return sendJson(res, 200, {
          household: fixtures.household,
          contract: fixtures.contract,
          forecast: fixtures.forecast,
          device_state: fixtures.deviceState,
          connectors: connectorStatus,
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
