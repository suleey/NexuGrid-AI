import { useEffect, useState } from "react";
import { Station, OptimizedRoute, AIPrediction } from "./types.ts";
import { InteractiveMap } from "./components/InteractiveMap.tsx";
import {
  awsComponents,
  dynamodbSchemas,
  apiEndpoints,
  hackathonBuildPlan,
  hackathonTeamRoles,
  mvpMissions,
} from "./data/architectureData.ts";
import {
  Cpu,
  Database,
  Cloud,
  Layers,
  Terminal,
  Clock,
  Zap,
  Activity,
  MapPin,
  Flame,
  CheckCircle,
  Copy,
  ChevronRight,
  TrendingUp,
  Sliders,
  Sparkles,
  CloudLightning,
  AlertCircle,
  Code,
  Users,
  Compass,
} from "lucide-react";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "architecture" | "api" | "sprint">("dashboard");

  // Core Simulation Coordinates (mapped 0-100)
  const [userLoc, setUserLoc] = useState({ x: 18, y: 22 });
  const [destLoc, setDestLoc] = useState({ x: 85, y: 72 });

  // EV Vehicle Telemetry & Simulator Inputs
  const [batteryPct, setBatteryPct] = useState<number>(35);
  const [batteryCapacity, setBatteryCapacity] = useState<number>(75); // kWh
  const [connectorType, setConnectorType] = useState<"CCS2" | "NACS" | "CHAdeMO" | "Type 2">("CCS2");
  const [trafficLevel, setTrafficLevel] = useState<"clear" | "moderate" | "congested">("moderate");
  const [weatherCondition, setWeatherCondition] = useState<"favorable" | "stormy" | "cold">("favorable");

  // Selected station highlight
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Live application data loaders
  const [stations, setStations] = useState<Station[]>([]);
  const [routeData, setRouteData] = useState<OptimizedRoute | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);

  // UI state toggles
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [logsList, setLogsList] = useState<Array<{ timestamp: string; message: string; type: "info" | "success" | "warn" | "aws" }>>([]);

  // Load initial dataset & run first computation
  useEffect(() => {
    fetchStations();
    addLog("System initialized in development sandbox mode.", "info");
    addLog("AWS CloudStack simulation engine: Online", "aws");
  }, []);

  // Recalculate routes whenever telemetry or vehicle positions move
  useEffect(() => {
    recalculateRouteAndAI();
  }, [userLoc, destLoc, batteryPct, connectorType, trafficLevel, weatherCondition]);

  const addLog = (message: string, type: "info" | "success" | "warn" | "aws" = "info") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${(now.getMilliseconds() / 10).toFixed(0).padStart(2, "0")}`;
    setLogsList((prev) => [{ timestamp: timeStr, message, type }, ...prev].slice(0, 50));
  };

  const fetchStations = async () => {
    try {
      const res = await fetch("/api/stations");
      const data = await res.json();
      if (data.stations) {
        setStations(data.stations);
      }
    } catch (e) {
      console.error("Failed to query station telemetry:", e);
      addLog("Database error: could not fetch stations list.", "warn");
    }
  };

  const recalculateRouteAndAI = async () => {
    setIsLoading(true);
    addLog(`Initiating AWS Lambda calculations: Location updated to (${userLoc.x}, ${userLoc.y})`, "aws");
    
    try {
      // 1. Math heuristic optimizer (calculates travel distances)
      const routeRes = await fetch("/api/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLoc: userLoc,
          destinationLoc: destLoc,
          batteryCapacityKwh: batteryCapacity,
          curBatteryPct: batteryPct,
          vehicleConnector: connectorType,
        }),
      });
      const routePayload = await routeRes.json();
      setRouteData(routePayload);
      addLog("AWS API Gateway mapped request successfully to RouteOptimizationLambda", "aws");

      // 2. Intelligent AI Predictor (calling Express middleware invoking Gemini or fallback heuristics)
      const aiRes = await fetch("/api/ai-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleBatteryPct: batteryPct,
          vehicleConnector: connectorType,
          currentLoc: userLoc,
          destinationLoc: destLoc,
          trafficLevel: trafficLevel,
          weatherCondition: weatherCondition,
        }),
      });
      const aiPayload = await aiRes.json();
      setAiPrediction(aiPayload);

      if (aiPayload.isMockMode) {
        addLog("AI model predicted queue delays utilizing offline fuzzy calculations", "info");
      } else {
        addLog("Gemini 3.5-flash live model successfully analyzed environmental parameters", "success");
      }
    } catch (e) {
      console.error("Routing simulation error:", e);
      addLog("Critical prediction failure inside AWS Lambda execution pipeline", "warn");
    } finally {
      setIsLoading(false);
    }
  };

  // Alter station queue dynamically
  const handleModifyQueue = async (stationId: string, action: "add" | "remove") => {
    try {
      const res = await fetch(`/api/stations/${stationId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Modified grid queue for ${data.station.name} (${action === "add" ? "+1 Car" : "-1 Car"})`, "success");
        // Refetch stations & calculate routing impacts immediately
        fetchStations().then(() => {
          recalculateRouteAndAI();
        });
      }
    } catch (e) {
      console.error("Queue state error:", e);
      addLog("Failed to push real-time queue modification to database", "warn");
    }
  };

  const handleCopySpec = (text: string, specId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(specId);
    addLog(`Copied spec identifier to clipboard`, "info");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Find currently highlighted station from state
  const currentStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 font-sans flex flex-col antialiased">
      {/* Top Professional Header */}
      <header className="h-16 border-b border-neutral-800 bg-[#0a0a0a] flex items-center justify-between px-4 sm:px-8 shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-white font-display text-base font-bold tracking-tight">NexuGrid AI</span>
            <span className="text-neutral-500 font-mono text-xs ml-2 hidden sm:inline">// Mobility Route Optimization Studio</span>
          </div>
        </div>

        {/* Global AWS Telemetry */}
        <div className="flex items-center gap-4 sm:gap-8 text-xs font-mono font-medium">
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-400">AWS Region: us-east-1 (N. Virginia)</span>
          </div>
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3/5 py-1 rounded">
            <span className="text-neutral-500">Node:</span>
            <span className="text-cyan-400">Tesla Mode 3 (CCS2)</span>
          </div>
        </div>
      </header>

      {/* Main Container Layer */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="xl:w-64 border-b xl:border-b-0 xl:border-r border-neutral-800 bg-[#080808] p-4 flex xl:flex-col gap-4 overflow-x-auto shrink-0 select-none">
          <div className="hidden xl:block">
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 block">PROJECT SCOPE</label>
            <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl mb-4 text-xs">
              <p className="font-bold text-white mb-1">AI-Powered EV Grid</p>
              <p className="text-neutral-400 leading-relaxed text-[11px]">AWS Stack & Route Prediction Engine designed for Demo-Day dominance.</p>
            </div>
          </div>

          <div className="flex xl:flex-col gap-2 w-full min-w-max xl:min-w-0">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 xl:flex-none flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-xl transition duration-200 border ${
                activeTab === "dashboard"
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/80"
                  : "bg-transparent text-neutral-400 border-transparent hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>EV Dashboard Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex-1 xl:flex-none flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-xl transition duration-200 border ${
                activeTab === "architecture"
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/80"
                  : "bg-transparent text-neutral-400 border-transparent hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>AWS Cloud Blueprint</span>
            </button>

            <button
              onClick={() => setActiveTab("api")}
              className={`flex-1 xl:flex-none flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-xl transition duration-200 border ${
                activeTab === "api"
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/80"
                  : "bg-transparent text-neutral-400 border-transparent hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Dynamo & API Specs</span>
            </button>

            <button
              onClick={() => setActiveTab("sprint")}
              className={`flex-1 xl:flex-none flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-xl transition duration-200 border ${
                activeTab === "sprint"
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/80"
                  : "bg-transparent text-neutral-400 border-transparent hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Team Sprint / Build</span>
            </button>
          </div>

          {/* Quick HUD Metrics */}
          <div className="mt-auto hidden xl:block space-y-3 pt-4 border-t border-neutral-900">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">AWS Telemetry Cache</span>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-400">DB Hits</span>
                <span className="text-emerald-400">99.8%</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-400">Lmb Uptime</span>
                <span className="text-cyan-400">99.99%</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg">
              <span className="text-[10px] text-cyan-400 font-mono block mb-1">PROTIP FOR JUDGES:</span>
              <p className="text-[10px] text-neutral-400 leading-tight">Drag the Blue (Car) or Red (Destination) markers on the map to trigger on-the-fly recalculations immediately!</p>
            </div>
          </div>
        </aside>

        {/* Central Workbench Panel */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-[#0d0d0d] min-h-0 relative">
          
          {/* TAB 1: INTERACTIVE MOBILITY PLATFORM */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Dynamic Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                    Predictive EV Route Optimizer
                    <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono border border-cyan-800">
                      Live Simulation
                    </span>
                  </h1>
                  <p className="text-neutral-400 text-xs sm:text-sm">
                    Drag coordinates to simulate the vehicle journey. Real-time availability score adjusts based on traffic & weather.
                  </p>
                </div>
                
                {/* Manual Recalculator Trigger */}
                <button
                  onClick={recalculateRouteAndAI}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-medium text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/10 hover:brightness-110 active:brightness-95 transition-all duration-200 disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Recalculate Route API</span>
                </button>
              </div>

              {/* Grid split: map on left, parameters on right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SVG Live Map */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono tracking-wider uppercase text-neutral-400">Interactive Map (0 - 100 Coordinates System)</span>
                    <span className="text-[11px] text-neutral-500">Drag Blue (Start) or Red (Destination)</span>
                  </div>
                  
                  <InteractiveMap
                    stations={stations}
                    userLoc={userLoc}
                    destLoc={destLoc}
                    onUpdateUserLoc={setUserLoc}
                    onUpdateDestLoc={setDestLoc}
                    selectedStationId={selectedStationId}
                    onSelectStation={setSelectedStationId}
                    recommendedStationId={aiPrediction?.recommendedStationId || null}
                    chargeNeeded={routeData?.primaryPath?.isChargeNeeded ?? false}
                  />
                </div>

                {/* Simulated Telemetry Control Deck */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Parameter sliders */}
                  <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xl">
                    <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-1.5 border-b border-neutral-900 pb-2">
                      <Sliders className="w-4 h-4" />
                      <span>Telemetry Simulator</span>
                    </h2>

                    <div className="space-y-4">
                      {/* Battery SoC Slider */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-neutral-300 font-medium">Vehicle State of Charge (SoC)</span>
                          <span className={`font-mono font-bold ${batteryPct < 25 ? "text-rose-400" : "text-emerald-400"}`}>
                            {batteryPct}% ({Math.round(batteryCapacity * (batteryPct / 100))} kWh left)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={batteryPct}
                          onChange={(e) => setBatteryPct(Number(e.target.value))}
                          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <span className="text-[10px] text-neutral-500 block mt-1">
                          Levels under 25% signal critical grid rerouting prompts
                        </span>
                      </div>

                      {/* Hardware Connector Preference */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Connector Port</label>
                          <select
                            value={connectorType}
                            onChange={(e: any) => setConnectorType(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          >
                            <option value="CCS2">CCS2 (European Standard)</option>
                            <option value="NACS">NACS (Tesla Supercharger)</option>
                            <option value="CHAdeMO">CHAdeMO (Asian DC Standard)</option>
                            <option value="Type 2">Type 2 (AC Slow Charger)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Battery Size (kWh)</label>
                          <select
                            value={batteryCapacity}
                            onChange={(e: any) => setBatteryCapacity(Number(e.target.value))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          >
                            <option value="50">50 kWh (Standard Ranges)</option>
                            <option value="75">75 kWh (Long Ranges)</option>
                            <option value="100">100 kWh (Performance Packs)</option>
                          </select>
                        </div>
                      </div>

                      {/* Environmental Multipliers */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Simulated Traffic</label>
                          <select
                            value={trafficLevel}
                            onChange={(e: any) => setTrafficLevel(e.target.value)}
                            className="w-full bg-neutral-950 border border-[#222] rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
                          >
                            <option value="clear">🟢 Clear Roads (1.0x Drain)</option>
                            <option value="moderate">🟡 Moderate Traffic (1.2x Drain)</option>
                            <option value="congested">🔴 Congested Grid (1.6x Stop/Go Drain)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Weather Climate</label>
                          <select
                            value={weatherCondition}
                            onChange={(e: any) => setWeatherCondition(e.target.value)}
                            className="w-full bg-neutral-950 border border-[#222] rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
                          >
                            <option value="favorable">🟢 Favorable Sun (22°C)</option>
                            <option value="stormy">🔴 Stormy / High wind</option>
                            <option value="cold">❄️ Severe Cold (-3°C)</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Active Station Grid queue controller */}
                  {currentStation ? (
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">{currentStation.name}</h3>
                          <p className="text-[11px] text-neutral-500 font-mono">ID: {currentStation.id}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          currentStation.queueSize >= 3 ? "bg-rose-950/40 text-rose-400 border border-rose-800/60" : "bg-neutral-900 border border-neutral-800 text-neutral-300"
                        }`}>
                          Queue: {currentStation.queueSize} cars
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div className="p-2 bg-neutral-950 border border-neutral-900 rounded-lg">
                          <span className="text-neutral-500 block text-[10px]">Estimated Wait Time</span>
                          <span className="text-white font-mono font-semibold">{currentStation.baseWaitMinutes} Minutes</span>
                        </div>
                        <div className="p-2 bg-neutral-950 border border-neutral-900 rounded-lg">
                          <span className="text-neutral-500 block text-[10px]">Charging Tariff</span>
                          <span className="text-white font-mono font-semibold">${currentStation.tariff.toFixed(2)}/kWh</span>
                        </div>
                      </div>

                      {/* Core queue toggler simulating AWS backends changes on-the-fly */}
                      <div className="bg-neutral-950 border border-neutral-900 p-3 rounded-xl mb-4">
                        <p className="text-[11px] text-neutral-400 leading-tight mb-2">
                          <strong className="text-cyan-400">AWS Hackathon Demo Mode:</strong> Click to increment or decrement queues below. Watch the routing engine reroute dynamically!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModifyQueue(currentStation.id, "add")}
                            className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-white rounded-lg"
                          >
                            Add Car to Queue
                          </button>
                          <button
                            onClick={() => handleModifyQueue(currentStation.id, "remove")}
                            disabled={currentStation.queueSize <= 0}
                            className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-white rounded-lg disabled:opacity-40"
                          >
                            Remove Car
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-1">Physical Plugs State</span>
                        <div className="grid grid-cols-2 gap-2">
                          {currentStation.connectors.map((c) => (
                            <div key={c.id} className="text-[10px] bg-neutral-950 border border-neutral-900 p-1.5 rounded flex justify-between items-center font-mono">
                              <span className="text-neutral-400">{c.type} • {c.speedKw}kW</span>
                              <span className={c.status === "available" ? "text-emerald-400 font-bold" : "text-neutral-600"}>
                                {c.status === "available" ? "IDLE" : `${c.remainingMinutes}m`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0a0a0a] border border-neutral-800 border-dashed rounded-2xl p-6 text-center text-xs text-neutral-500">
                      <MapPin className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                      <p>Click any charging station node on the map to inspect live plugs, adjust queues, or view estimated wait delays.</p>
                    </div>
                  )}

                </div>
              </div>

              {/* AI Routing Results Dashboard Panel */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Leg Distance Metrics Card */}
                <div className="md:col-span-4 bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-widest text-neutral-400 mb-3 block">Estimated Route Analytics</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <span className="text-neutral-500 text-[10px] block">Cumulative Multi-Leg Distance</span>
                        <p className="text-2xl font-bold font-display text-white">
                          {routeData?.primaryPath ? `${routeData.primaryPath.totalDistance} km` : "Loading..."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-neutral-900 pt-3">
                        <div>
                          <span className="text-neutral-500 text-[10px] block font-mono">Est Duration</span>
                          <span className="text-sm font-semibold text-neutral-200">
                            {routeData?.primaryPath ? `${routeData.primaryPath.estimatedDurationMinutes} Mins` : "..."}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[10px] block font-mono">Reroutes Needed</span>
                          <span className={`text-sm font-semibold flex items-center gap-1 ${
                            routeData?.primaryPath?.isChargeNeeded ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {routeData?.primaryPath?.isChargeNeeded ? "⚡ 1 Charge Stop" : "Direct path safe"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-900 text-[11px] text-neutral-500 leading-tight">
                    Average continuous EV degradation: <strong className="text-cyan-500">0.20 kWh per kilometer</strong> combined with dynamic wind resistance variables.
                  </div>
                </div>

                {/* AI Predictive Recommendations Output */}
                <div className="md:col-span-8 bg-[#0a0a0a] border border-cyan-900/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xs uppercase font-mono tracking-widest text-cyan-400 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 animate-bounce text-cyan-400" />
                        <span>AI Intelligent Recommendation Output</span>
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        aiPrediction?.isMockMode ? "bg-amber-950/40 text-amber-400 border border-amber-800/50" : "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50"
                      }`}>
                        {aiPrediction?.isMockMode ? "HEURISTIC MESH ENG" : "GEMINI 3.5 LIVE MODE"}
                      </span>
                    </div>

                    {/* Reasoning box */}
                    <div className="bg-neutral-950/60 border border-neutral-900 rounded-xl p-4 mb-4">
                      {aiPrediction ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 font-sans">
                            <span className="text-xs font-bold text-white">Recommended Target ID:</span>
                            <span className="text-xs font-mono bg-cyan-950/50 text-cyan-400 px-2 py-0.2 rounded border border-cyan-800">
                              {aiPrediction.recommendedStationId}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed italic">
                            "{aiPrediction.recommendationReasoning}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500 italic">Synthesizing telemetry profiles with predictive heuristics...</p>
                      )}
                    </div>

                    {/* Forecast Table */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">Predictive Delay Wait-times Matrix</span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {aiPrediction?.predictedWaitTimes ? (
                          aiPrediction.predictedWaitTimes.map((item) => {
                            const matchingStation = stations.find((s) => s.id === item.stationId);
                            const isSelected = selectedStationId === item.stationId;
                            const isRec = aiPrediction?.recommendedStationId === item.stationId;

                            return (
                              <div
                                key={item.stationId}
                                onClick={() => setSelectedStationId(item.stationId)}
                                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                                  isRec
                                    ? "bg-cyan-950/30 border-cyan-500/55"
                                    : isSelected
                                    ? "bg-neutral-900 border-neutral-200"
                                    : "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                                }`}
                              >
                                <span className="text-[10px] font-semibold text-neutral-400 block truncate leading-none mb-1">
                                  {matchingStation?.name.split(" ")[0] || item.stationId}
                                </span>
                                <span className={`text-sm font-bold font-mono block ${isRec ? "text-cyan-400" : "text-white"}`}>
                                  {item.minutes}m wait
                                </span>
                                <span className="text-[9px] text-neutral-500 block font-mono">
                                  Score: {item.availabilityScore}/10
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-5 text-center py-2 text-xs text-neutral-600">Generating live predictive grids...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="text-[10px] text-neutral-400 font-mono leading-none">
                      💡 Advisory: <span className="text-neutral-300">{aiPrediction?.optimizedRouteNotes || "Analyzing grid thermal dynamics..."}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: AWS CLOUD bluePRINT / SCHEMATICS */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                  AWS Serverless Cloud Ecosystem Blueprint
                  <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono border border-cyan-800">
                    Production Specifications
                  </span>
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  Complete architecture blueprint designed to sustain unlimited scale. Click any service node to view its role, scalability parameters, and cloud-native source definitions.
                </p>
              </div>

              {/* AWS cloud map nodes visual connector */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-6">Interactive Architecture Topology Map</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative z-10 text-center">
                  
                  {/* CLIENT */}
                  <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-cyan-500/50 transition">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">FRONTEND CDN</span>
                    <strong className="text-sm font-bold text-white block">Amplify / S3</strong>
                    <p className="text-[10px] text-neutral-500 mt-2">Delivers static single-page React app (this portal) globally.</p>
                  </div>

                  <div className="flex items-center justify-center text-neutral-600">
                    <ChevronRight className="w-5 h-5 hidden md:block" />
                    <span className="text-xs font-mono block md:hidden py-1 border-b border-neutral-800">CORS Handshake</span>
                  </div>

                  {/* API GATEWAY */}
                  <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-cyan-500/50 transition">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">REST GATEWAY</span>
                    <strong className="text-sm font-bold text-white block">API Gateway</strong>
                    <p className="text-[10px] text-neutral-500 mt-2">Rate-limits & maps client request JSON arrays to computing Lambda functions.</p>
                  </div>

                  <div className="flex flex-col items-center justify-center text-neutral-600">
                    <ChevronRight className="w-5 h-5 hidden md:block" />
                    <span className="text-xs font-mono block md:hidden py-1 border-b border-neutral-800">Triggers (100ms lag)</span>
                  </div>

                  {/* COMPUTING LAMBDAS */}
                  <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl md:col-span-2 flex flex-col justify-between hover:border-cyan-500/50 transition">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">ELASTIC COMPUTE</span>
                    <strong className="text-sm font-bold text-white block">AWS Lambdas (Core)</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-neutral-950 p-1.5 rounded text-[9px] font-mono text-neutral-300 border border-neutral-800">
                        RouteOptimize
                      </div>
                      <div className="bg-neutral-950 p-1.5 rounded text-[9px] font-mono text-neutral-300 border border-neutral-800">
                        PredictiveWait
                      </div>
                    </div>
                  </div>

                </div>

                {/* Vertical connections downwards */}
                <div className="h-8 flex justify-center items-center text-neutral-700 font-mono text-xs my-3">
                  │ Sync Telemetry & Inference Queries
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 max-w-2xl mx-auto text-center">
                  {/* DYNAMODB */}
                  <div className="bg-gradient-to-b from-neutral-900 to-neutral-900 hover:to-cyan-950/20 border border-neutral-850 p-4 rounded-2xl flex flex-col justify-between hover:border-cyan-500/40 transition">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">TELEMETRY DATABASE</span>
                    <strong className="text-sm font-bold text-white block">Amazon DynamoDB (NoSQL)</strong>
                    <p className="text-[10px] text-neutral-500 mt-2">Stores instant charger adapter configurations, commuter logs and queue counters.</p>
                  </div>

                  {/* SAGEMAKER */}
                  <div className="bg-gradient-to-b from-neutral-900 to-neutral-900 hover:to-emerald-950/20 border border-neutral-850 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">MACHINE LEARNING</span>
                    <strong className="text-sm font-bold text-white block">Amazon SageMaker</strong>
                    <p className="text-[10px] text-neutral-500 mt-2">Hosts historical model pipelines (e.g. XGBoost) or proxy LLM orchestrations.</p>
                  </div>
                </div>
              </div>

              {/* Detail cards list with actual CloudFormation/CDK configurations */}
              <div className="space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 block">Cloud Services Specifications Detail Deck</span>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {awsComponents.map((comp) => (
                    <div key={comp.id} className="bg-[#0a0a0a] border border-neutral-850 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 block uppercase">{comp.awsService}</span>
                            <h3 className="text-sm font-bold text-white">{comp.title}</h3>
                          </div>
                          <button
                            onClick={() => handleCopySpec(comp.sampleCodeSnippet, comp.id)}
                            className="bg-neutral-950 border border-neutral-800 p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition"
                            title="Copy Code Snippet"
                          >
                            {copiedText === comp.id ? (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1">COPIED</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                          {comp.role}
                        </p>

                        <div className="text-[11px] font-mono bg-neutral-950 border border-neutral-850 rounded-lg p-2 mb-4 text-cyan-400/90 leading-normal">
                          <strong className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-0.5">Scale Matrix Details</strong>
                          {comp.scaleAspect}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Production Template Blueprint</span>
                        <pre className="bg-black border border-neutral-900 rounded-lg p-3 font-mono text-[10px] text-yellow-100/80 overflow-x-auto leading-relaxed">
                          {comp.sampleCodeSnippet}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMODB SCHEMA & API SPEC INSPECTOR */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                  Database Schema & API Specifications
                  <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono border border-cyan-800">
                    Judge Review Ready
                  </span>
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  Complete DynamoDB schema partitions and API blueprints implementing this MVP. Use these details to guarantee technical high marks on design scoring metrics.
                </p>
              </div>

              {/* Schemas flex split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* DynamoDB schema models (5 columns) */}
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500">DynamoDB Structural Tables Schemas</h3>
                  
                  {dynamodbSchemas.map((schema) => (
                    <div key={schema.tableName} className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-3 border-b border-neutral-900 pb-2">
                        <Database className="w-5 h-5 text-cyan-400" />
                        <div>
                          <strong className="text-white text-xs block font-mono">Table: {schema.tableName}</strong>
                          <span className="text-[10px] text-neutral-500">AutoScaling Enabled • Active Grid Stream</span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-xs font-mono">
                        <div className="flex justify-between border-b border-neutral-950 pb-1">
                          <span className="text-neutral-500">Partition Key (PK)</span>
                          <span className="text-cyan-400 font-bold">{schema.partitionKey}</span>
                        </div>
                        {schema.sortKey && (
                          <div className="flex justify-between border-b border-neutral-950 pb-1">
                            <span className="text-neutral-500">Sort Key (SK)</span>
                            <span className="text-emerald-400 font-bold">{schema.sortKey}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 mb-4">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Dynamo attributes structure</span>
                        <div className="space-y-1">
                          {schema.attributes.map((attr) => (
                            <div key={attr.name} className="flex justify-between text-[11px] leading-tight">
                              <span className="font-mono text-white font-medium">{attr.name} <span className="text-neutral-500 font-normal">({attr.type})</span></span>
                              <span className="text-neutral-400 text-right max-w-[180px] truncate" title={attr.desc}>{attr.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">DynamoDB Item Serialization Format</span>
                        <pre className="bg-black border border-neutral-900 rounded-lg p-3 font-mono text-[10px] text-green-300 overflow-x-auto leading-relaxed">
                          {schema.sampleItem}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                {/* API specification schema endpoints (7 columns) */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500">API Gateway Proxy Endpoint Definition Specs</h3>
                  
                  {apiEndpoints.map((end) => (
                    <div key={end.path} className="bg-[#0a0a0a] border border-neutral-850 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-3 border-b border-neutral-900 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            end.method === "POST" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "bg-emerald-950 text-emerald-400 border border-emerald-850"
                          }`}>
                            {end.method}
                          </span>
                          <span className="text-xs font-mono text-white font-bold">{end.path}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">Proxy: Lambda Trigger</span>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        {end.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {end.requestBody && (
                          <div className="md:col-span-6">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Client JSON Payload</span>
                            <pre className="bg-black border border-neutral-900 rounded-lg p-2 font-mono text-[9px] text-neutral-300 overflow-x-auto h-32 leading-relaxed">
                              {end.requestBody}
                            </pre>
                          </div>
                        )}
                        <div className={end.requestBody ? "md:col-span-6" : "md:col-span-12"}>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">API Response JSON Payload</span>
                          <pre className="bg-black border border-neutral-900 rounded-lg p-2 font-mono text-[9px] text-cyan-300 overflow-x-auto h-32 leading-relaxed">
                            {end.responseBody}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: HACKATHON BUILD TIMELINE (24 - 48h) */}
          {activeTab === "sprint" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                  Hackathon 24–48 Hours Build Plan
                  <span className="text-xs bg-[#c084fc]/20 text-[#c084fc] px-2.5 py-0.5 rounded-full font-mono border border-[#a855f7]/30 animate-pulse">
                    Sprint Master
                  </span>
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  Complete roadmap designed to scale an MVP systematically over a rapid hackathon timeframe under a divided 3-5 member structure.
                </p>
              </div>

              {/* Target scopes breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mvpMissions.map((item, index) => (
                  <div key={index} className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${index === 0 ? "bg-cyan-400" : index === 1 ? "bg-emerald-400" : "bg-[#c084fc]"}`} />
                        <h4 className="text-xs font-mono font-bold uppercase text-white">{item.title}</h4>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-4 pt-2 border-t border-neutral-900">
                      Phase Objective: {index === 0 ? "Critical Foundation" : index === 1 ? "Inference Hook" : "Winning Edge Component"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Horizontal team task assignments */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Assigned Development Team Roles (3-4 Members Grid)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {hackathonTeamRoles.map((member) => (
                    <div key={member.name} className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <strong className="text-white text-xs block font-bold mb-0.5">{member.name}</strong>
                        <span className="text-[10px] font-mono text-cyan-400 block mb-3 uppercase">{member.role}</span>
                        
                        <ul className="space-y-1.5 text-xs text-neutral-400">
                          {member.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-1.5 font-sans leading-snug">
                              <span className="text-cyan-500 select-none">▶</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main sprint timeline map charts */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500">Step-by-Step Hourly Milestones Execution Pipeline</h3>
                
                <div className="space-y-4">
                  {hackathonBuildPlan.map((stage, sIdx) => (
                    <div key={stage.stage} className="bg-[#0a0a0a] border border-neutral-850 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between gap-6 hover:border-neutral-700 transition">
                      <div className="md:w-1/3 shrink-0">
                        <span className="text-[11px] font-mono text-cyan-400 block font-bold mb-1">{stage.stage}</span>
                        <h4 className="text-xs font-mono font-bold text-white mb-2">{stage.milestone}</h4>
                        <div className="flex gap-2 text-[10px] font-mono">
                          <span className="bg-neutral-950 border border-neutral-900 px-2.5 py-0.5 rounded text-neutral-400">Owner: {stage.owner}</span>
                        </div>
                      </div>

                      <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-neutral-900 pt-4 md:pt-0 md:pl-6">
                        <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                          {stage.desc}
                        </p>

                        <div className="space-y-1 bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 block mb-1">Execution Action Checklists</span>
                          {stage.checklist.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>

        {/* Real-time System Logs Console Panel (Sticky Lower HUD) */}
        <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-neutral-800 bg-[#080808] p-4 flex flex-col shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono tracking-wide uppercase text-neutral-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>AWS CloudStack Live Logs</span>
            </span>
            <button
              onClick={() => setLogsList([])}
              className="text-[9px] font-mono uppercase bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-500 hover:text-neutral-300 px-2 py-0.5 rounded transition"
            >
              Clear Buffer
            </button>
          </div>

          <div
            id="logs-live-console-view"
            className="flex-1 bg-black rounded-xl p-3 font-mono text-[10px] leading-relaxed text-blue-300/90 border border-neutral-900 overflow-y-auto max-h-[160px] xl:max-h-none h-[160px] xl:h-auto"
          >
            {logsList.length === 0 ? (
              <p className="text-neutral-700 italic">Listening for live telemetry, user drag coordinates, queue adjustments, and AWS invoke signals...</p>
            ) : (
              <div className="space-y-1">
                {logsList.map((log, i) => {
                  let badgeColor = "text-neutral-500";
                  if (log.type === "success") badgeColor = "text-emerald-400 font-bold";
                  if (log.type === "warn") badgeColor = "text-rose-400 font-bold";
                  if (log.type === "aws") badgeColor = "text-cyan-400";

                  return (
                    <div key={i} className="border-b border-neutral-950 pb-0.5 flex gap-2">
                      <span className="text-neutral-600">{log.timestamp}</span>
                      <span className={badgeColor}>[{log.type.toUpperCase()}]</span>
                      <span className="text-neutral-300 flex-1">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Bottom Status Feed Bar */}
      <footer className="h-10 bg-[#050505] border-t border-neutral-800 flex items-center justify-between px-4 sm:px-8 text-[10px] font-mono text-neutral-500 select-none">
        <div className="flex gap-4 sm:gap-6">
          <span>DB_LATENCY: <strong className="text-emerald-500">12ms</strong></span>
          <span>LAMBDA_INVOCATIONS: <strong className="text-cyan-500">2.4k invocations</strong></span>
          <span>API_GATEWAY_UPTIME: <strong className="text-emerald-500">100%</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-600 italic">Built for EV Mobility Hackathon Demo</span>
          <div className="w-1 h-1 rounded-full bg-cyan-500" />
          <span className="text-neutral-400">v0.1.2-alpha</span>
        </div>
      </footer>
    </div>
  );
}
