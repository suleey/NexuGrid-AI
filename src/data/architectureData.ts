import { AWSComponent, DynamoSchema, EndpointSpec, TeamMember } from "../types.ts";

export const awsComponents: AWSComponent[] = [
  {
    id: "amplify-cloudfront",
    title: "Amplify / CloudFront Frontend",
    awsService: "Amazon CloudFront & Amplify",
    role: "Delivers the React dashboard SPA globally via an edge-cached CDN with HTTPS and dynamic compression.",
    scaleAspect: "Serverless web hosting with automatically provisioned SSL/TLS certificating and fast rollbacks.",
    sampleCodeSnippet: `# AWS Amplify CLI setup
amplify init
amplify add hosting
amplify publish`
  },
  {
    id: "api-gateway",
    title: "API Gateway (REST Front)",
    awsService: "Amazon API Gateway",
    role: "Acts as the single entry point for client requests, providing CORS management, rate-limiting, and routing to Lambda triggers.",
    scaleAspect: "Supports throttling (e.g. 100 requests/sec limit during demo) and API keys for third-party partnerships.",
    sampleCodeSnippet: `// CloudFormation specification excerpt
Type: AWS::ApiGatewayV2::Api
Properties:
  Name: EVChargingSystemAPI
  ProtocolType: HTTP
  Target: !GetAtt RouteOptimizationLambda.Arn`
  },
  {
    id: "route-optimize-lambda",
    title: "Route Optimization Engine",
    awsService: "AWS Lambda (Compute Node)",
    role: "Executes on-demand calculations to match incoming grid vehicles with optimal charging adapters and route distances.",
    scaleAspect: "Scales elastically from 0 to thousands of concurrent requests in 100ms. Pay-per-execution billing.",
    sampleCodeSnippet: `// Lambda Handler (Node.js/ESM)
export const handler = async (event) => {
  const { currentLoc, destinationLoc, vehicleConnector } = JSON.parse(event.body);
  const totalDist = Math.sqrt(Math.pow(destinationLoc.x - currentLoc.x, 2) + Math.pow(destinationLoc.y - currentLoc.y, 2)) * 1.5;
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dist: totalDist, match: true })
  };
};`
  },
  {
    id: "predict-availability-lambda",
    title: "Predictive Queue Engine",
    awsService: "AWS Lambda (AI Inference/Logic)",
    role: "Calls the serverless machine-learning prediction routine or lightweight model regression to calculate expected station delay trends.",
    scaleAspect: "Queries charging histories from DynamoDB and merges telemetry parameters with weather/traffic queues.",
    sampleCodeSnippet: `// SageMaker / Bedrock Calling Excerpt
const sagemakerClient = new SageMakerRuntimeClient({ region: "us-east-1" });
const response = await sagemakerClient.send(new InvokeEndpointCommand({
  EndpointName: "ev-predictions-xgboost-v1",
  Body: JSON.stringify({ features: [distance, queueSize, trafficCoefficient] }),
  ContentType: "application/json"
}));`
  },
  {
    id: "dynamodb",
    title: "DynamoDB (Global Telemetry Store)",
    awsService: "Amazon DynamoDB (NoSQL)",
    role: "Stores real-time charger connector status blocks, driver sessions, and queue backlogs with sub-10ms transactional speeds.",
    scaleAspect: "Supports On-Demand scaling capacity, automated point-in-time recovery, and time-to-live triggers for active sessions.",
    sampleCodeSnippet: `// Write item using AWS SDK v3
const command = new PutItemCommand({
  TableName: "EVStationsPool",
  Item: {
    StationID: { S: "station-alpha" },
    LiveQueue: { N: "3" },
    Status: { S: "Active" }
  }
});`
  },
  {
    id: "sagemaker",
    title: "SageMaker (ML Pipelines)",
    awsService: "Amazon SageMaker (Predictive Modeling)",
    role: "Hosts our SageMaker training pipelines (XGBoost/RandomForest) trained on historical grid occupancy logs to generate predicted waiting timelines.",
    scaleAspect: "Provides serverless inference endpoints that auto-scale down to zero during idle grid traffic to minimize expenses.",
    sampleCodeSnippet: `# SageMaker Serverless Endpoint configuration (Python / Boto3)
sagemaker_client.create_endpoint_config(
    EndpointConfigName="EVServerlessConfig",
    ProductionVariants=[{
        "ModelName": "XGBoostChargingPredictor",
        "VariantName": "AllTraffic",
        "ServerlessConfig": {
            "MemorySizeInMB": 2048,
            "MaxConcurrency": 10
        }
    }]
)`
  }
];

export const dynamodbSchemas: DynamoSchema[] = [
  {
    tableName: "EVStationsPool",
    partitionKey: "StationID (String - UUID)",
    sortKey: "RegionID (String - e.g. METRO_CENTRAL)",
    attributes: [
      { name: "Name", type: "String", desc: "Human readable station name" },
      { name: "Coordinates", type: "Map {x: Float, y: Float}", desc: "Grid positioning metrics" },
      { name: "QueueSize", type: "Number", desc: "Active count of EVs queued" },
      { name: "BaseWaitMinutes", type: "Number", desc: "Estimated base wait time" },
      { name: "Tariff", type: "Number", desc: "Power pricing multiplier per kWh" },
      { name: "Connectors", type: "List [Map]", desc: "Aggregated hardware interfaces specifications" }
    ],
    sampleItem: `{
  "StationID": { "S": "station-alpha" },
  "RegionID": { "S": "METRO_CENTRAL" },
  "Name": { "S": "VoltHub Downtown Supercharger" },
  "Coordinates": { "M": { "x": { "N": "25" }, "y": { "N": "30" } } },
  "QueueSize": { "N": "3" },
  "Tariff": { "N": "0.38" },
  "Connectors": { "L": [
     { "M": { "id": {"S": "c1"}, "type": {"S": "CCS2"}, "speedKw": {"N": "350"}, "status": {"S": "occupied"} } }
  ]}
}`
  },
  {
    tableName: "ActiveSessions",
    partitionKey: "SessionID (String - UUID)",
    sortKey: "UserID (String - UUID)",
    attributes: [
      { name: "StationID", type: "String", desc: "Reference ID of plugged station" },
      { name: "ConnectorID", type: "String", desc: "Reference ID of plugged trigger socket" },
      { name: "StartSoCPct", type: "Number", desc: "State of Charge % upon parking" },
      { name: "TargetSoCPct", type: "Number", desc: "State of Charge target parameter" },
      { name: "ChargedKwh", type: "Number", desc: "Cumulative active energy funneled" },
      { name: "Status", type: "String", desc: "ACTIVE | COMPLETED | TERMINATED" }
    ],
    sampleItem: `{
  "SessionID": { "S": "session-908" },
  "UserID": { "S": "usr-442" },
  "StationID": { "S": "station-beta" },
  "ConnectorID": { "S": "c8" },
  "StartSoCPct": { "N": "14" },
  "TargetSoCPct": { "N": "80" },
  "Status": { "S": "ACTIVE" }
}`
  },
  {
    tableName: "TelemetryLogsStream",
    partitionKey: "VehicleID (String)",
    sortKey: "Timestamp (Number - Epoch)",
    attributes: [
      { name: "Location", type: "Map {x: Float, y: Float}", desc: "Instantaneous physical grid coordinates" },
      { name: "BatterySocPct", type: "Number", desc: "Active state of charge" },
      { name: "ConsumptionRate", type: "Number", desc: "Current kWh consumption index" },
      { name: "ConnectorType", type: "String", desc: "Vehicle hardware socket standard" }
    ],
    sampleItem: `{
  "VehicleID": { "S": "EV-TESLA-3X" },
  "Timestamp": { "N": "1772659619" },
  "Location": { "M": { "x": { "N": "10.4" }, "y": { "N": "15.2" } } },
  "BatterySocPct": { "N": "30" },
  "ConnectorType": { "S": "NACS" }
}`
  }
];

export const apiEndpoints: EndpointSpec[] = [
  {
    method: "GET",
    path: "/api/stations",
    description: "Fetches full telemetry array for nearby EV charging stations including connector speeds, tariffs, and current queue sizes.",
    responseBody: `[
  {
    "id": "station-alpha",
    "name": "VoltHub Downtown Supercharger",
    "x": 25,
    "y": 30,
    "queueSize": 3,
    "baseWaitMinutes": 15,
    "tariff": 0.38,
    "connectors": [ ... ]
  }
]`
  },
  {
    method: "POST",
    path: "/api/route-optimize",
    description: "Calculates optimal routes, battery consumption matrices, and travel reserves based on current location and destination coordinates.",
    requestBody: `{
  "currentLoc": { "x": 10, "y": 10 },
  "destinationLoc": { "x": 90, "y": 90 },
  "batteryCapacityKwh": 75,
  "curBatteryPct": 30,
  "vehicleConnector": "CCS2"
}`,
    responseBody: `{
  "primaryPath": {
    "totalDistance": 120,
    "isChargeNeeded": true,
    "stopsCount": 1,
    "estimatedDurationMinutes": 144
  },
  "recommendedStation": {
    "id": "station-beta",
    "name": "ElectraRoute Highway Hub",
    "distToStation": 82,
    "routingScore": 92.5
  }
}`
  },
  {
    method: "POST",
    path: "/api/ai-predict",
    description: "Leverages Gemini AI to process real-time grid conditions, weather impacts, commuter queues, and connectors standards to predict charging window latency bottlenecks.",
    requestBody: `{
  "vehicleBatteryPct": 30,
  "vehicleConnector": "CCS2",
  "currentLoc": { "x": 10, "y": 12 },
  "destinationLoc": { "x": 80, "y": 80 },
  "trafficLevel": "congested",
  "weatherCondition": "stormy"
}`,
    responseBody: `{
  "recommendedStationId": "station-beta",
  "recommendationReasoning": "Station Beta is recommended because Route A is heavily congested. Stormy weather triggers 15% acceleration in battery discharge. Station Beta features CCS2 standard with 3 available 350kW active plugs which minimizes total thermal exposure.",
  "predictedWaitTimes": [
    { "stationId": "station-alpha", "minutes": 27, "availabilityScore": 4, "peakHoursRecommendation": "Avoid 17:00-19:30" },
    { "stationId": "station-beta", "minutes": 5, "availabilityScore": 9, "peakHoursRecommendation": "Optimal now" }
  ],
  "optimizedRouteNotes": "Precondition battery module starting 12 mins before arrival to activate maximum peak 350kW acceptance.",
  "isMockMode": false
}`
  }
];

export const hackathonBuildPlan = [
  {
    stage: "01: CORE ARCHITECTURE & SCHEMAS (Hours 0 - 6)",
    desc: "Establish core platform state, define DynamoDB structural keys, and hook together Lambda templates.",
    owner: "Lead Architect / Backend Engineer",
    milestone: "Database Schema generated, local container mocking ready.",
    checklist: [
      "Provision DynamoDB tables (StationsPool, ActiveSessions) in local serverless shell.",
      "Write OpenAPI definitions corresponding to /stations and /route-optimize.",
      "Initialize Lambda projects with ESM TypeScript compilation."
    ]
  },
  {
    stage: "02: ROUTING LOGIC & AI PREDICTION INTEGRATION (Hours 6 - 18)",
    desc: "Develop grid calculations and orchestrate Gemini API / SageMaker inference connections.",
    owner: "AI Specialist / Backend Engineer",
    milestone: "Predictive routing API returns valid wait-times based on fluctuating weather parameters.",
    checklist: [
      "Implement Cartesian coordinate distance router with SoC state-of-charge calculation.",
      "Connect @google/genai SDK on the API Gateway proxy to pipe weather, standard and queue triggers.",
      "Optimize XML/JSON structured schema guidelines to enforce strict model output compliance."
    ]
  },
  {
    stage: "03: INTERACTIVE DASHBOARD & SIMULATOR (Hours 18 - 30)",
    desc: "Construct the React UI, featuring the vector cyber-grid map, vehicle panel controls, and real-time simulator telemetry toggles.",
    owner: "Frontend Engineer / UI/UX Designer",
    milestone: "Fully interactive SVG map rendering nodes, routes, boundaries, and station overlays.",
    checklist: [
      "Code interactive Map with dragging, coordinate tracking, and destination picking support.",
      "Build visual telemetry controls for SoC percentages, current charger plugs filter, and grid traffic status.",
      "Animate active state transitions using 'transitions' (framer-motion wrappers) to show route changes seamlessly."
    ]
  },
  {
    stage: "04: INTEGRATION & STRESS DEMO (Hours 30 - 42)",
    desc: "Hook frontend to backend API layers, perform live simulations of queue congestion, and prepare pitching artifacts.",
    owner: "Full Stack Engineer / DevOps Admin",
    milestone: "Live demo simulation of simulated queues changes dynamic vehicle routing immediately.",
    checklist: [
      "Connect telemetry simulator sliders directly to backend route calculator endpoints.",
      "Embed full interactive cloud design, database schema inspectors, and endpoint visualizers directly inside the UI.",
      "Prepare a 3-slide pitch template aligning directly to the system layout."
    ]
  },
  {
    stage: "05: DEPLOYMENT & POLISH (Hours 42 - 48)",
    desc: "Build static pages, host on CloudFront/Amplify, and configure active Lambda route throttling variables.",
    owner: "All Team Members",
    milestone: "Platform is live on public Amplify URL, pitch ready for judges.",
    checklist: [
      "Execute production production build task to output optimized dist static bundles.",
      "Setup AWS CloudFront caching policies to disable caching for API endpoints but cache images.",
      "Perform test walk-through of the demo script on multiple cellular screen heights."
    ]
  }
];

export const hackathonTeamRoles: TeamMember[] = [
  {
    name: "Architect & Backend Lead",
    role: "Database Provisioner & API Gateway Setup",
    tasks: [
      "Create DynamoDB tables with appropriate Indexes",
      "Draft CloudFormation / CDK stack templates",
      "Deploy scalable AWS Lambda handlers on API Gateway"
    ]
  },
  {
    name: "Machine Learning / AI Developer",
    role: "Route Optimizer & Predictive Models Orchestrator",
    tasks: [
      "Write vehicle routing heuristics & mathematical models",
      "Integrate Gemini LLM proxy with structured schema patterns to compute wait times",
      "Create serverless SageMaker container endpoints for traffic forecasting validation"
    ]
  },
  {
    name: "Frontend Engineer & UX Designer",
    role: "Dynamic Interface & GIS Map Builder",
    tasks: [
      "Construct high-contrast interactive vector map widgets in React",
      "Develop responsive vehicle telemetry and state of charge sliders",
      "Design clean tab layouts allowing judges to browse visual app and cloud specifications"
    ]
  }
];

export const mvpMissions = [
  { title: "24-Hour Base Core", desc: "A robust interactive SVG grid map showing real-time charger telemetry (base station lists, active connector status, queues) coupled with vehicle sliders." },
  { title: "48-Hour Ultimate Scope", desc: "Fully connected AI Predictive module utilizing Google Gen AI / SageMaker that receives dynamic coordinates, computes live wait-times, and presents detailed AWS deployment artifacts." },
  { title: "Winning Demo Secret", desc: "To impress the judges, provide an interactive simulated telemetry panel where changing queue parameters can trigger instant AI routing changes on-the-fly, accompanied by live production logs." }
];
