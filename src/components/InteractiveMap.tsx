import React, { useRef, useState } from "react";
import { Station } from "../types.ts";
import { MapPin, Navigation, Compass, BatteryCharging } from "lucide-react";

interface InteractiveMapProps {
  stations: Station[];
  userLoc: { x: number; y: number };
  destLoc: { x: number; y: number };
  onUpdateUserLoc: (loc: { x: number; y: number }) => void;
  onUpdateDestLoc: (loc: { x: number; y: number }) => void;
  selectedStationId: string | null;
  onSelectStation: (id: string | null) => void;
  recommendedStationId: string | null;
  chargeNeeded: boolean;
}

export function InteractiveMap({
  stations,
  userLoc,
  destLoc,
  onUpdateUserLoc,
  onUpdateDestLoc,
  selectedStationId,
  onSelectStation,
  recommendedStationId,
  chargeNeeded,
}: InteractiveMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<"user" | "dest" | null>(null);

  const handlePointerDown = (type: "user" | "dest") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDrag(type);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    if (activeDrag === "user") {
      onUpdateUserLoc({ x, y });
    } else {
      onUpdateDestLoc({ x, y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveDrag(null);
    }
  };

  // Convert map coordinates (0-100) to SVG percentage values
  const getX = (coordVal: number) => `${coordVal}%`;
  const getY = (coordVal: number) => `${coordVal}%`;

  // Find recommended station coordinates
  const recStation = stations.find((s) => s.id === recommendedStationId);

  return (
    <div id="grid-map-container" className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[380px] lg:min-h-[500px]">
      {/* Top Banner Status Bar */}
      <div id="map-telemetry-header" className="absolute top-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 text-xs font-mono font-medium rounded-lg text-slate-300 border border-slate-800 flex justify-between items-center z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>CYBER-GRID SIMULATION: ACTIVE</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Vehicle: ({userLoc.x}, {userLoc.y})</span>
          <span>Destination: ({destLoc.x}, {destLoc.y})</span>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <svg
        id="interactive-svg-map"
        ref={svgRef}
        onPointerMove={handlePointerMove}
        className="w-full h-full select-none"
        style={{ minHeight: "380px" }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="1" />
          </pattern>
          <radialGradient id="user-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dest-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid Background Pattern */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Ambient Ring Highways */}
        <circle cx="50%" cy="50%" r="35%" fill="none" stroke="rgba(148, 163, 184, 0.05)" strokeWidth="4" />
        <circle cx="50%" cy="50%" r="20%" fill="none" stroke="rgba(148, 163, 184, 0.03)" strokeWidth="2" />

        {/* Simulated Road Connections */}
        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(51,65,85,0.2)" strokeWidth="1.5" strokeDasharray="5,5" />
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(51,65,85,0.2)" strokeWidth="1.5" strokeDasharray="5,5" />
        <line x1="10%" y1="10%" x2="90%" y2="90%" stroke="rgba(51,65,85,0.15)" strokeWidth="1" />
        <line x1="10%" y1="90%" x2="90%" y2="10%" stroke="rgba(51,65,85,0.15)" strokeWidth="1" />

        {/* Route Visualization Path */}
        {chargeNeeded && recStation ? (
          <>
            {/* Leg 1: Current Pos to recommended Station */}
            <line
              x1={getX(userLoc.x)}
              y1={getY(userLoc.y)}
              x2={getX(recStation.x)}
              y2={getY(recStation.y)}
              stroke="#0ea5e9"
              strokeWidth="3.5"
              strokeDasharray="4 4"
              className="animate-[dash_60s_linear_infinite]"
            />
            {/* Leg 2: recommended Station to Destination */}
            <line
              x1={getX(recStation.x)}
              y1={getY(recStation.y)}
              x2={getX(destLoc.x)}
              y2={getY(destLoc.y)}
              stroke="#10b981"
              strokeWidth="3"
            />
          </>
        ) : (
          /* Direct Optimized Route */
          <line
            x1={getX(userLoc.x)}
            y1={getY(userLoc.y)}
            x2={getX(destLoc.x)}
            y2={getY(destLoc.y)}
            stroke="#10b981"
            strokeWidth="3.5"
          />
        )}

        {/* EV Station Map Pins */}
        {stations.map((s) => {
          const isSelected = selectedStationId === s.id;
          const isRecommended = recommendedStationId === s.id;
          const availableCount = s.connectors.filter((c) => c.status === "available").length;

          // Compute color accent
          let pinColor = "#f59e0b"; // Warning/Caution (steady queue/busy)
          if (availableCount > 1) pinColor = "#10b981"; // Excellent/High supply
          if (s.queueSize >= 3) pinColor = "#ef4444"; // Severely bottlenecked

          return (
            <g
              key={s.id}
              className="cursor-pointer group select-none"
              onClick={() => onSelectStation(isSelected ? null : s.id)}
            >
              {/* Pulsing recommendation highlight ring */}
              {isRecommended && (
                <circle
                  cx={getX(s.x)}
                  cy={getY(s.y)}
                  r="30"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  className="pulse-animation"
                />
              )}

              {/* Station Glow Background */}
              <circle
                cx={getX(s.x)}
                cy={getY(s.y)}
                r={isSelected ? "18" : "12"}
                fill={pinColor}
                fillOpacity="0.15"
                className="transition-all duration-300"
              />

              {/* Station Pin */}
              <circle
                cx={getX(s.x)}
                cy={getY(s.y)}
                r={isSelected ? "8" : "6"}
                fill={isRecommended ? "#38bdf8" : pinColor}
                stroke="#0f172a"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />

              {/* Connector count visual badge */}
              <g transform={`translate(${s.x}%, ${s.y}%)`}>
                <text
                  x="12"
                  y="4"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="bg-slate-900 border px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                >
                  {s.name} ({availableCount}/{s.connectors.length} Plug)
                </text>
              </g>
            </g>
          );
        })}

        {/* User Current Vehicle Pin */}
        <g
          className="cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown("user")}
          onPointerUp={handlePointerUp}
        >
          {/* Draggable Circle Glow */}
          <circle cx={getX(userLoc.x)} cy={getY(userLoc.y)} r="24" fill="url(#user-glow)" />
          
          <circle
            cx={getX(userLoc.x)}
            cy={getY(userLoc.y)}
            r="8"
            fill="#0ea5e9"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={userLoc.x < 85 ? `${userLoc.x + 3}%` : `${userLoc.x - 22}%`}
            y={`${userLoc.y - 2}%`}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            className="pointer-events-none select-none bg-slate-950"
          >
            DRAG ME (CAR)
          </text>
        </g>

        {/* Destination Target Pin */}
        <g
          className="cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown("dest")}
          onPointerUp={handlePointerUp}
        >
          {/* Glow and Flag */}
          <circle cx={getX(destLoc.x)} cy={getY(destLoc.y)} r="24" fill="url(#dest-glow)" />
          
          <circle
            cx={getX(destLoc.x)}
            cy={getY(destLoc.y)}
            r="8"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={destLoc.x < 85 ? `${destLoc.x + 3}%` : `${destLoc.x - 22}%`}
            y={`${destLoc.y - 2}%`}
            fill="#f43f5e"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            className="pointer-events-none select-none bg-slate-950"
          >
            DRAG ME (DEST)
          </text>
        </g>
      </svg>

      {/* Map Drag Legend Info Bar */}
      <div id="map-legend-footer" className="absolute bottom-3 left-3 right-3 bg-slate-950/90 border border-slate-800/80 rounded-lg px-3 py-2 text-[10px] sm:text-xs text-slate-400 font-mono flex flex-wrap gap-x-4 gap-y-1 justify-between select-none">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" /> High Supply
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Busy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Heavy Queue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-2 border-[#38bdf8] rounded-full" /> Winner Match
          </span>
        </div>
        <div className="hidden md:block text-slate-500">
          <span>※ Drag blue/red markers anywhere to recalculate route</span>
        </div>
      </div>
    </div>
  );
}
