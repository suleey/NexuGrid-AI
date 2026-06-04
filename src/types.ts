export interface Connector {
  id: string;
  type: "CCS2" | "CHAdeMO" | "NACS" | "Type 2";
  speedKw: number;
  status: "available" | "occupied";
  remainingMinutes: number;
}

export interface Station {
  id: string;
  name: string;
  x: number; // 0-100 grid x coord
  y: number; // 0-100 grid y coord
  connectors: Connector[];
  baseWaitMinutes: number;
  queueSize: number;
  tariff: number; // USD per kWh
  rating: number;
  amenities: string[];
}

export interface OptimizedRoute {
  primaryPath: {
    totalDistance: number;
    isChargeNeeded: boolean;
    stopsCount: number;
    estimatedDurationMinutes: number;
  };
  recommendedStation: (Station & {
    distToStation: number;
    distFromStationToDest: number;
    supportsConnector: boolean;
    chargingAvailable: number;
    totalTravelExtra: number;
    routingScore: number;
  }) | null;
  stationsAnalyzed: Array<Station & {
    distToStation: number;
    distFromStationToDest: number;
    supportsConnector: boolean;
    chargingAvailable: number;
    totalTravelExtra: number;
    routingScore: number;
  }>;
}

export interface AIPrediction {
  recommendedStationId: string;
  recommendationReasoning: string;
  predictedWaitTimes: Array<{
    stationId: string;
    minutes: number;
    availabilityScore: number; // 1 to 10
    peakHoursRecommendation: string;
  }>;
  optimizedRouteNotes: string;
  isMockMode: boolean;
}

export interface AWSComponent {
  id: string;
  title: string;
  awsService: string;
  description?: string;
  role: string;
  scaleAspect: string;
  sampleCodeSnippet: string;
}

export interface DynamoSchema {
  tableName: string;
  partitionKey: string;
  sortKey?: string;
  attributes: Array<{ name: string; type: string; desc: string }>;
  sampleItem: string;
}

export interface EndpointSpec {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

export interface TeamMember {
  name: string;
  role: string;
  tasks: string[];
}
