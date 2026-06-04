import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-defined high-fidelity dataset representing real-world charging stations
let stations = [
  {
    id: "station-alpha",
    name: "VoltHub Downtown Supercharger",
    x: 25,
    y: 30,
    connectors: [
      { id: "c1", type: "CCS2", speedKw: 350, status: "occupied", remainingMinutes: 12 },
      { id: "c2", type: "CCS2", speedKw: 350, status: "occupied", remainingMinutes: 4 },
      { id: "c3", type: "CCS2", speedKw: 150, status: "occupied", remainingMinutes: 28 },
      { id: "c4", type: "CCS2", speedKw: 150, status: "available", remainingMinutes: 0 },
      { id: "c5", type: "NACS", speedKw: 250, status: "occupied", remainingMinutes: 18 },
      { id: "c6", type: "NACS", speedKw: 250, status: "occupied", remainingMinutes: 32 },
    ],
    baseWaitMinutes: 15,
    queueSize: 3,
    tariff: 0.38, // $/kWh
    rating: 4.8,
    amenities: ["Cafe", "WiFi", "Restrooms", "Shopping"],
  },
  {
    id: "station-beta",
    name: "ElectraRoute Highway Hub",
    x: 65,
    y: 40,
    connectors: [
      { id: "c7", type: "CCS2", speedKw: 350, status: "occupied", remainingMinutes: 15 },
      { id: "c8", type: "CCS2", speedKw: 350, status: "occupied", remainingMinutes: 44 },
      { id: "c9", type: "CCS2", speedKw: 350, status: "occupied", remainingMinutes: 2 },
      { id: "c10", type: "CHAdeMO", speedKw: 100, status: "available", remainingMinutes: 0 },
      { id: "c11", type: "CCS2", speedKw: 150, status: "available", remainingMinutes: 0 },
      { id: "c12", type: "CCS2", speedKw: 150, status: "available", remainingMinutes: 0 },
    ],
    baseWaitMinutes: 5,
    queueSize: 1,
    tariff: 0.42, // $/kWh
    rating: 4.5,
    amenities: ["Diner", "WiFi", "Restrooms", "EV Lounge"],
  },
  {
    id: "station-gamma",
    name: "GridPulse West Ecocharger",
    x: 18,
    y: 72,
    connectors: [
      { id: "c13", type: "CCS2", speedKw: 150, status: "occupied", remainingMinutes: 8 },
      { id: "c14", type: "CCS2", speedKw: 150, status: "occupied", remainingMinutes: 19 },
      { id: "c15", type: "Type 2", speedKw: 22, status: "available", remainingMinutes: 0 },
      { id: "c16", type: "Type 2", speedKw: 22, status: "available", remainingMinutes: 0 },
    ],
    baseWaitMinutes: 0,
    queueSize: 0,
    tariff: 0.29, // $/kWh
    rating: 4.2,
    amenities: ["Supermarket", "Restrooms"],
  },
  {
    id: "station-delta",
    name: "E-Express East Link",
    x: 82,
    y: 75,
    connectors: [
      { id: "c17", type: "NACS", speedKw: 350, status: "occupied", remainingMinutes: 25 },
      { id: "c18", type: "NACS", speedKw: 350, status: "occupied", remainingMinutes: 30 },
      { id: "c19", type: "NACS", speedKw: 250, status: "occupied", remainingMinutes: 14 },
      { id: "c20", type: "NACS", speedKw: 250, status: "occupied", remainingMinutes: 45 },
    ],
    baseWaitMinutes: 25,
    queueSize: 4,
    tariff: 0.45,
    rating: 4.6,
    amenities: ["Coffee Shop", "Restrooms"],
  },
  {
    id: "station-epsilon",
    name: "EcoCharge North Plaza",
    x: 48,
    y: 85,
    connectors: [
      { id: "c21", type: "CCS2", speedKw: 150, status: "available", remainingMinutes: 0 },
      { id: "c22", type: "CCS2", speedKw: 150, status: "available", remainingMinutes: 0 },
      { id: "c23", type: "Type 2", speedKw: 22, status: "occupied", remainingMinutes: 4 },
      { id: "c24", type: "Type 2", speedKw: 22, status: "available", remainingMinutes: 0 },
    ],
    baseWaitMinutes: 0,
    queueSize: 0,
    tariff: 0.32,
    rating: 4.4,
    amenities: ["Park", "WiFi", "Restrooms"],
  },
];

// Lazy-initialized Gemini-client helper
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    aiInstance = new GoogleGenAI({
      apiKey: key || "DEMO_KEY_FALLBACK_VAL",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get active stations pool
  app.get("/api/stations", (req, res) => {
    res.json({ stations });
  });

  // Post API to simulate plugging in a driver or altering queue
  app.post("/api/stations/:id/queue", (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // "add" or "remove"
    const target = stations.find((s) => s.id === id);
    if (!target) {
       res.status(404).json({ error: "Station not found" });
       return;
    }
    if (action === "add") {
      target.queueSize += 1;
      target.baseWaitMinutes += Math.round(15 / (target.connectors.length || 1));
    } else if (action === "remove" && target.queueSize > 0) {
      target.queueSize -= 1;
      target.baseWaitMinutes = Math.max(0, target.baseWaitMinutes - Math.round(15 / (target.connectors.length || 1)));
    }
    res.json({ success: true, station: target });
  });

  // Route optimization helper endpoint
  app.post("/api/route-optimize", (req, res) => {
    const { currentLoc, destinationLoc, batteryCapacityKwh, curBatteryPct, targetSocPct, vehicleConnector } = req.body;

    const source = currentLoc || { x: 10, y: 10 };
    const dest = destinationLoc || { x: 90, y: 90 };
    const batPct = curBatteryPct !== undefined ? curBatteryPct : 32;
    const cap = batteryCapacityKwh || 75;

    // Direct distance calculation (Cyber Metro-Grid coordinate units)
    const totalDist = Math.round(Math.sqrt(Math.pow(dest.x - source.x, 2) + Math.pow(dest.y - source.y, 2)) * 1.5);
    
    // Average EV consumption: 0.2 kWh / km
    const batteryUsedTarget = totalDist * 0.2; 
    const currentKwhLeft = (batPct / 100) * cap;
    const isChargeNeeded = currentKwhLeft < batteryUsedTarget + (0.15 * cap); // Needs 15% reserve buffer

    // Simple routing engine: score nearest/best charging solutions based on vehicle alignment
    const validStations = stations.map((s) => {
      const distToStation = Math.round(Math.sqrt(Math.pow(s.x - source.x, 2) + Math.pow(s.y - source.y, 2)) * 1.5);
      const distFromStationToDest = Math.round(Math.sqrt(Math.pow(dest.x - s.x, 2) + Math.pow(dest.y - s.y, 2)) * 1.5);
      const supportsConnector = s.connectors.some((c) => c.type === vehicleConnector);
      const chargingAvailable = s.connectors.filter((c) => c.status === "available" && c.type === vehicleConnector).length;

      // Score station: higher is better
      let score = 100 - (distToStation * 0.5) - (s.baseWaitMinutes * 1.5);
      if (supportsConnector) score += 30;
      if (chargingAvailable > 0) score += 20;

      return {
        ...s,
        distToStation,
        distFromStationToDest,
        supportsConnector,
        chargingAvailable,
        totalTravelExtra: distToStation + distFromStationToDest - totalDist,
        routingScore: score,
      };
    });

    const recommended = validStations.reduce((best, curr) => curr.routingScore > best.routingScore ? curr : best, validStations[0]);

    res.json({
      primaryPath: {
        totalDistance: totalDist,
        isChargeNeeded,
        stopsCount: isChargeNeeded ? 1 : 0,
        estimatedDurationMinutes: Math.round(totalDist * 1.2), // 1.2 min per grid km
      },
      recommendedStation: isChargeNeeded ? recommended : null,
      stationsAnalyzed: validStations
    });
  });

  // AI Predict & Recommend powered by Gemini 3.5-flash
  app.post("/api/ai-predict", async (req, res) => {
    const { vehicleBatteryPct, vehicleConnector, currentLoc, destinationLoc, trafficLevel, weatherCondition } = req.body;

    const bat = vehicleBatteryPct !== undefined ? vehicleBatteryPct : 30;
    const connector = vehicleConnector || "CCS2";
    const source = currentLoc || { x: 10, y: 15 };
    const dest = destinationLoc || { x: 85, y: 90 };
    const traffic = trafficLevel || "moderate";
    const weather = weatherCondition || "favorable";

    // Prepare text representation of system state for LLM logic representation
    const statsPayload = stations.map(s => {
      const distance = Math.round(Math.sqrt(Math.pow(s.x - source.x, 2) + Math.pow(s.y - source.y, 2)) * 1.5);
      const compatibleConnectors = s.connectors.filter(c => c.type === connector);
      const freePlugs = compatibleConnectors.filter(c => c.status === "available").length;
      return {
        id: s.id,
        name: s.name,
        distanceKm: distance,
        totalPlugs: s.connectors.length,
        compatiblePlugs: compatibleConnectors.length,
        freeCompatiblePlugs: freePlugs,
        queueSize: s.queueSize,
        baseWaitMinutes: s.baseWaitMinutes,
        tariff: s.tariff,
        rating: s.rating
      };
    });

    const isApiKeyConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";

    if (!isApiKeyConfigured) {
      // Return high-quality local fallback predictions so app stays perfectly interactive
      const predictedWaitTimes = statsPayload.map((u) => {
        // Fallback mathematical model: Queue delay + availability penalty
        let minutes = u.baseWaitMinutes;
        if (u.freeCompatiblePlugs === 0) {
          minutes += 12;
        }
        if (traffic === "congested") {
          minutes += 8;
        }
        if (weather === "stormy") {
          minutes += 5; // slow plugging
        }
        
        let score = Math.max(1, Math.min(10, Math.round(10 - (minutes / 6) - (u.distanceKm / 15))));
        if (u.compatiblePlugs === 0) score = 0; // Not queryable

        return {
          stationId: u.id,
          minutes,
          availabilityScore: score,
          peakHoursRecommendation: "Avoid 17:00 - 19:30 on weekdays due to peak commuter demand."
        };
      });

      // Simple score ranker
      const candidates = predictedWaitTimes.filter(p => {
        const matchingStation = statsPayload.find(s => s.id === p.stationId);
        return matchingStation && matchingStation.compatiblePlugs > 0;
      });
      const bestCandidate = candidates.sort((a,b) => (b.availabilityScore - a.availabilityScore))[0] || { stationId: "station-alpha" };
      const matched = statsPayload.find(s => s.id === bestCandidate.stationId);

      const responseBody = {
        recommendedStationId: bestCandidate.stationId,
        recommendationReasoning: `🔋 [SIMULATED PREDICTION ENGINE] Station ${matched ? matched.name : 'Unknown'} is recommended. With your battery at ${bat}%, distance constraint is satisfied. Distance is ${matched?.distanceKm}km, queue length is ${matched?.queueSize}. Note: Input a valid GEMINI_API_KEY under Secrets Settings to activate live LLM predictions!`,
        predictedWaitTimes,
        optimizedRouteNotes: `Speed limit advised at 110 km/h to optimize battery degradation index, traffic conditions is currently ${traffic}.`,
        isMockMode: true
      };

       res.json(responseBody);
       return;
    }

    try {
      const ai = getGemini();
      const prompt = `
        You are the Smart AI Router and Predictive Charger Orchestrator for our AWS Cloud EV MVP Hackathon Project.
        Analyze the current vehicle telemetry, weather state, traffic level, and EV charger list, and calculate:
        1. Recommended station ID (must match exactly one of the station IDs provided: 'station-alpha', 'station-beta', 'station-gamma', 'station-delta', 'station-epsilon')
        2. Detailed reasoning text pointing directly to the driver's Battery level, distance, wait time and rating.
        3. Predicted wait time in minutes for each of the 5 stations under active parameters.
        4. Elevation/Route advisory optimizations notes.

        Current Parameters:
        - Vehicle Current Battery State: ${bat}% State-of-Charge (SoC)
        - Desired Connector: "${connector}" (Crucial: do not recommend station that lacks compatible plugs!)
        - Weather Condition: "${weather}" (Stormy or Cold drains battery faster and slows charging speed)
        - Cyber-Grid Traffic State: "${traffic}" (Congested traffic shifts bottleneck factors)
        - Station Telemetry: ${JSON.stringify(statsPayload)}

        Return a strictly formatted JSON response satisfying the required schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedStationId: {
                type: Type.STRING,
                description: "The accurate recommended station ID based on compatibilities, queues, and battery."
              },
              recommendationReasoning: {
                type: Type.STRING,
                description: "Detailed, professional paragraph to show to the driver."
              },
              predictedWaitTimes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stationId: { type: Type.STRING },
                    minutes: { type: Type.INTEGER, description: "Predicted wait time in minutes" },
                    availabilityScore: { type: Type.NUMBER, description: "Calculated availability score (1 to 10)" },
                    peakHoursRecommendation: { type: Type.STRING, description: "Recommended charge windows" }
                  },
                  required: ["stationId", "minutes", "availabilityScore", "peakHoursRecommendation"]
                }
              },
              optimizedRouteNotes: {
                type: Type.STRING,
                description: "Eco-driving and thermal pre-conditioning notes."
              }
            },
            required: ["recommendedStationId", "recommendationReasoning", "predictedWaitTimes", "optimizedRouteNotes"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json({ ...parsed, isMockMode: false });

    } catch (e: any) {
      console.error("Gemini AI API failure:", e);
      res.status(500).json({ error: "Failed to query Gemini AI model", details: e?.message || e });
    }
  });

  // Serve static assets or frontend index depending on Node env
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched successfully routing backends on http://localhost:${PORT}`);
  });
}

startServer();
