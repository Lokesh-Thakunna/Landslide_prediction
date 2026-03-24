import bcrypt from "bcryptjs";
import {
  District,
  DangerZone,
  ElevationProfile,
  EvacuationRoute,
  ForecastPoint,
  Hotspot,
  LiveWeather,
  MediaReport,
  PredictionCore,
  RoadCondition,
  RoadSegment,
  RiskLevel,
  SafeShelter,
  Subscription,
  ZoneStatic
} from "@bhurakshan/contracts";

export type SeedUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "DISTRICT_OFFICIAL" | "ANALYST";
  districtId?: string;
};

const nowIso = () => new Date().toISOString();
const inHoursIso = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const scoreToLevel = (score: number): RiskLevel => {
  if (score >= 70) {
    return "DANGER";
  }

  if (score >= 30) {
    return "WATCH";
  }

  return "SAFE";
};

export const seedUsers: SeedUser[] = [
  {
    id: "usr-admin",
    name: "Platform Admin",
    email: "admin@bhurakshan.local",
    passwordHash: bcrypt.hashSync("Admin@123", 10),
    role: "ADMIN"
  },
  {
    id: "usr-chamoli-ops",
    name: "Chamoli Operator",
    email: "chamoli.ops@bhurakshan.local",
    passwordHash: bcrypt.hashSync("Chamoli@123", 10),
    role: "DISTRICT_OFFICIAL",
    districtId: "dist-chamoli"
  },
  {
    id: "usr-analyst",
    name: "Forecast Analyst",
    email: "analyst@bhurakshan.local",
    passwordHash: bcrypt.hashSync("Analyst@123", 10),
    role: "ANALYST"
  }
];

export const seedDistricts: District[] = [
  {
    id: "dist-almora",
    name: "Almora",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-kumaoni"
  },
  {
    id: "dist-bageshwar",
    name: "Bageshwar",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-kumaoni"
  },
  {
    id: "dist-chamoli",
    name: "Chamoli",
    stateName: "Uttarakhand",
    zoneCount: 2,
    defaultLanguage: "hi-x-garhwali"
  },
  {
    id: "dist-champawat",
    name: "Champawat",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-kumaoni"
  },
  {
    id: "dist-dehradun",
    name: "Dehradun",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi"
  },
  {
    id: "dist-haridwar",
    name: "Haridwar",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi"
  },
  {
    id: "dist-nainital",
    name: "Nainital",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-kumaoni"
  },
  {
    id: "dist-pauri-garhwal",
    name: "Pauri Garhwal",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-garhwali"
  },
  {
    id: "dist-pithoragarh",
    name: "Pithoragarh",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-kumaoni"
  },
  {
    id: "dist-rudraprayag",
    name: "Rudraprayag",
    stateName: "Uttarakhand",
    zoneCount: 1,
    defaultLanguage: "hi-x-garhwali"
  },
  {
    id: "dist-tehri-garhwal",
    name: "Tehri Garhwal",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi-x-garhwali"
  },
  {
    id: "dist-udham-singh-nagar",
    name: "Udham Singh Nagar",
    stateName: "Uttarakhand",
    zoneCount: 0,
    defaultLanguage: "hi"
  },
  {
    id: "dist-uttarkashi",
    name: "Uttarkashi",
    stateName: "Uttarakhand",
    zoneCount: 1,
    defaultLanguage: "hi-x-garhwali"
  }
];

export const seedZones: ZoneStatic[] = [
  {
    id: "zone-joshimath-core",
    districtId: "dist-chamoli",
    districtName: "Chamoli",
    name: "Joshimath Core",
    centroidLat: 30.5552,
    centroidLon: 79.5644,
    slopeDegrees: 38.5,
    historicalLandslideFrequency: 8.7,
    riskPriority: 5,
    isActive: true
  },
  {
    id: "zone-helang-slope",
    districtId: "dist-chamoli",
    districtName: "Chamoli",
    name: "Helang Slope Corridor",
    centroidLat: 30.628,
    centroidLon: 79.607,
    slopeDegrees: 34.2,
    historicalLandslideFrequency: 6.9,
    riskPriority: 4,
    isActive: true
  },
  {
    id: "zone-rudraprayag-nh",
    districtId: "dist-rudraprayag",
    districtName: "Rudraprayag",
    name: "Rudraprayag NH Corridor",
    centroidLat: 30.2844,
    centroidLon: 78.9811,
    slopeDegrees: 31.8,
    historicalLandslideFrequency: 5.6,
    riskPriority: 3,
    isActive: true
  },
  {
    id: "zone-uttarkashi-ridge",
    districtId: "dist-uttarkashi",
    districtName: "Uttarkashi",
    name: "Uttarkashi Ridge Belt",
    centroidLat: 30.728,
    centroidLon: 78.443,
    slopeDegrees: 36.1,
    historicalLandslideFrequency: 7.1,
    riskPriority: 4,
    isActive: true
  }
];

export const seedDangerZones: DangerZone[] = [
  {
    id: "danger-joshimath-upper-cut",
    zoneId: "zone-joshimath-core",
    name: "Upper slope cut debris fan",
    type: "debris_flow",
    severity: "critical",
    source: "operator",
    note: "Fresh debris movement reported along the upper slope-cut edge. Do not approach from the north-east ridge lane.",
    updatedAt: nowIso(),
    active: true,
    polygon: [
      { lat: 30.5589, lon: 79.5661 },
      { lat: 30.5598, lon: 79.5692 },
      { lat: 30.5568, lon: 79.5713 },
      { lat: 30.5549, lon: 79.5679 }
    ]
  },
  {
    id: "danger-joshimath-ridge-crack",
    zoneId: "zone-joshimath-core",
    name: "Ridge settlement crack belt",
    type: "slope_crack",
    severity: "high",
    source: "field_report",
    note: "Visible ground cracking near ridge houses. Avoid stopping or gathering on the upper terrace.",
    updatedAt: nowIso(),
    active: true,
    polygon: [
      { lat: 30.5537, lon: 79.5598 },
      { lat: 30.5545, lon: 79.5632 },
      { lat: 30.5517, lon: 79.5646 },
      { lat: 30.5509, lon: 79.5611 }
    ]
  },
  {
    id: "danger-helang-road-slip",
    zoneId: "zone-helang-slope",
    name: "Helang bend road collapse edge",
    type: "road_collapse",
    severity: "high",
    source: "worker_sync",
    note: "Road shoulder is unstable near the bend. Keep evacuees away from the outer edge.",
    updatedAt: nowIso(),
    active: true,
    polygon: [
      { lat: 30.6269, lon: 79.6041 },
      { lat: 30.6286, lon: 79.6075 },
      { lat: 30.6261, lon: 79.6102 },
      { lat: 30.6248, lon: 79.6065 }
    ]
  },
  {
    id: "danger-rudraprayag-stream-block",
    zoneId: "zone-rudraprayag-nh",
    name: "Stream blockage spill zone",
    type: "stream_blockage",
    severity: "advisory",
    source: "field_report",
    note: "Small blockage may divert runoff across the lower track during heavy rain.",
    updatedAt: nowIso(),
    active: true,
    polygon: [
      { lat: 30.2858, lon: 78.9788 },
      { lat: 30.2871, lon: 78.9814 },
      { lat: 30.2847, lon: 78.9832 },
      { lat: 30.2837, lon: 78.9805 }
    ]
  }
];

export const seedShelters: SafeShelter[] = [
  {
    id: "shelter-joshimath-college",
    zoneId: "zone-joshimath-core",
    districtId: "dist-chamoli",
    name: "Government Inter College",
    lat: 30.5488,
    lon: 79.5581,
    capacity: 350,
    elevationM: 1915,
    distanceKm: 1.8,
    contactNumber: "+919999999901",
    instructionSummary: "Move south toward the college ground and avoid upper ridge lanes."
  },
  {
    id: "shelter-helang-school",
    zoneId: "zone-helang-slope",
    districtId: "dist-chamoli",
    name: "Helang Primary School",
    lat: 30.6239,
    lon: 79.6001,
    capacity: 180,
    elevationM: 1542,
    distanceKm: 1.2,
    contactNumber: "+919999999902",
    instructionSummary: "Follow the lower road toward the school courtyard."
  },
  {
    id: "shelter-rudraprayag-hall",
    zoneId: "zone-rudraprayag-nh",
    districtId: "dist-rudraprayag",
    name: "Rudraprayag Community Hall",
    lat: 30.2798,
    lon: 78.9764,
    capacity: 280,
    elevationM: 904,
    distanceKm: 1.5,
    contactNumber: "+919999999903",
    instructionSummary: "Use the market-side access road and stay away from the cut slope."
  },
  {
    id: "shelter-uttarkashi-ground",
    zoneId: "zone-uttarkashi-ridge",
    districtId: "dist-uttarkashi",
    name: "Town Relief Ground",
    lat: 30.7216,
    lon: 78.4374,
    capacity: 320,
    elevationM: 1165,
    distanceKm: 2,
    contactNumber: "+919999999904",
    instructionSummary: "Take the main descent road and keep clear of the upper drainage edge."
  }
];

export const seedRoutes: EvacuationRoute[] = [
  {
    id: "route-joshimath-01",
    zoneId: "zone-joshimath-core",
    safeShelterId: "shelter-joshimath-college",
    distanceKm: 1.8,
    estimatedMinutes: 24,
    instructionSummary: "Proceed via the main southbound road. Do not use the damaged hillside alley.",
    steps: [
      "Head south on the main road away from the upper ridge lane.",
      "Stay clear of the damaged hillside alley near the slope cut.",
      "Continue to Government Inter College shelter."
    ],
    routeType: "verified_path",
    bearingDegrees: 226,
    isUphill: false,
    segmentIds: ["segment-joshimath-main-road", "segment-joshimath-college-approach"],
    roadStatus: "caution",
    cautionSegmentCount: 1,
    blockedSegmentCount: 0,
    elevationGainM: 28,
    elevationLossM: 96,
    valleyExposure: "moderate",
    pathCategory: "primary",
    avoidsStreams: true,
    hazardNotes: "Use the marked shoulder through the debris bend and do not pause below cracked walls.",
    verifiedBy: "Chamoli Operator",
    verifiedAt: nowIso(),
    routeWarnings: [
      "Upper ridge shortcut is unstable and should not be used.",
      "Move on the marked road shoulder through the debris-prone bend."
    ]
  },
  {
    id: "route-helang-01",
    zoneId: "zone-helang-slope",
    safeShelterId: "shelter-helang-school",
    distanceKm: 1.2,
    estimatedMinutes: 16,
    instructionSummary: "Use the lower access road and gather at the school courtyard.",
    steps: [
      "Move along the lower access road away from the cut slope.",
      "Keep to the road shoulder and avoid loose rock edges.",
      "Enter Helang Primary School courtyard."
    ],
    routeType: "verified_path",
    bearingDegrees: 228,
    isUphill: false,
    segmentIds: ["segment-helang-lower-road", "segment-helang-school-link"],
    roadStatus: "caution",
    cautionSegmentCount: 1,
    blockedSegmentCount: 0,
    elevationGainM: 14,
    elevationLossM: 72,
    valleyExposure: "moderate",
    pathCategory: "primary",
    avoidsStreams: true,
    hazardNotes: "Upper bend is unsafe after rainfall; remain on the lower access road.",
    verifiedBy: "Chamoli Operator",
    verifiedAt: nowIso(),
    routeWarnings: [
      "One bend has loose rock on the uphill shoulder.",
      "Avoid stopping below fresh cut-slope scars."
    ]
  },
  {
    id: "route-rudraprayag-01",
    zoneId: "zone-rudraprayag-nh",
    safeShelterId: "shelter-rudraprayag-hall",
    distanceKm: 1.5,
    estimatedMinutes: 20,
    instructionSummary: "Move through the market connector and avoid the exposed roadside edge.",
    steps: [
      "Take the market connector road toward the community hall.",
      "Avoid the exposed roadside edge below the cut slope.",
      "Gather inside Rudraprayag Community Hall."
    ],
    routeType: "verified_path",
    bearingDegrees: 227,
    isUphill: false,
    segmentIds: ["segment-rudraprayag-market-link", "segment-rudraprayag-hall-approach"],
    roadStatus: "open",
    cautionSegmentCount: 0,
    blockedSegmentCount: 0,
    elevationGainM: 18,
    elevationLossM: 61,
    valleyExposure: "low",
    pathCategory: "primary",
    avoidsStreams: true,
    hazardNotes: "Keep to the market connector and stay above the river-side shoulder.",
    verifiedBy: "Platform Admin",
    verifiedAt: nowIso(),
    routeWarnings: [
      "Stay on the market connector and keep away from the river-side edge."
    ]
  },
  {
    id: "route-uttarkashi-01",
    zoneId: "zone-uttarkashi-ridge",
    safeShelterId: "shelter-uttarkashi-ground",
    distanceKm: 2,
    estimatedMinutes: 28,
    instructionSummary: "Descend by the main road and regroup at the relief ground.",
    steps: [
      "Follow the main road down from the ridge shoulder.",
      "Keep away from the upper drainage edge and loose embankments.",
      "Continue to the Town Relief Ground."
    ],
    routeType: "verified_path",
    bearingDegrees: 229,
    isUphill: false,
    segmentIds: ["segment-uttarkashi-descent", "segment-uttarkashi-ground-link"],
    roadStatus: "caution",
    cautionSegmentCount: 1,
    blockedSegmentCount: 0,
    elevationGainM: 10,
    elevationLossM: 122,
    valleyExposure: "high",
    pathCategory: "primary",
    avoidsStreams: true,
    hazardNotes: "Do not descend via the drainage footpath; use only the main road.",
    verifiedBy: "Forecast Analyst",
    verifiedAt: nowIso(),
    routeWarnings: [
      "Descending stretch narrows after rainfall.",
      "Keep clear of the upper drainage outlet near the final bend."
    ]
  }
];

export const seedRoadSegments: RoadSegment[] = [
  {
    id: "segment-joshimath-upper-cut",
    zoneId: "zone-joshimath-core",
    name: "Upper Ridge Shortcut",
    roadClass: "local",
    priorityRank: 3,
    lengthKm: 0.7,
    coordinates: [
      { lat: 30.5588, lon: 79.5667 },
      { lat: 30.5569, lon: 79.5636 },
      { lat: 30.5549, lon: 79.5611 }
    ]
  },
  {
    id: "segment-joshimath-main-road",
    zoneId: "zone-joshimath-core",
    name: "Main Southbound Road",
    roadClass: "connector",
    priorityRank: 1,
    lengthKm: 1.1,
    coordinates: [
      { lat: 30.5561, lon: 79.5642 },
      { lat: 30.5531, lon: 79.5614 },
      { lat: 30.5505, lon: 79.5592 }
    ]
  },
  {
    id: "segment-joshimath-college-approach",
    zoneId: "zone-joshimath-core",
    name: "College Approach",
    roadClass: "local",
    priorityRank: 2,
    lengthKm: 0.6,
    coordinates: [
      { lat: 30.5505, lon: 79.5592 },
      { lat: 30.5496, lon: 79.5587 },
      { lat: 30.5488, lon: 79.5581 }
    ]
  },
  {
    id: "segment-helang-upper-bend",
    zoneId: "zone-helang-slope",
    name: "Upper Bend",
    roadClass: "local",
    priorityRank: 3,
    lengthKm: 0.5,
    coordinates: [
      { lat: 30.6271, lon: 79.6067 },
      { lat: 30.6259, lon: 79.6041 },
      { lat: 30.6246, lon: 79.6022 }
    ]
  },
  {
    id: "segment-helang-lower-road",
    zoneId: "zone-helang-slope",
    name: "Lower Access Road",
    roadClass: "connector",
    priorityRank: 1,
    lengthKm: 0.8,
    coordinates: [
      { lat: 30.6278, lon: 79.6071 },
      { lat: 30.6255, lon: 79.6038 },
      { lat: 30.6243, lon: 79.6014 }
    ]
  },
  {
    id: "segment-helang-school-link",
    zoneId: "zone-helang-slope",
    name: "School Courtyard Link",
    roadClass: "local",
    priorityRank: 2,
    lengthKm: 0.4,
    coordinates: [
      { lat: 30.6243, lon: 79.6014 },
      { lat: 30.6241, lon: 79.6008 },
      { lat: 30.6239, lon: 79.6001 }
    ]
  },
  {
    id: "segment-rudraprayag-river-edge",
    zoneId: "zone-rudraprayag-nh",
    name: "River Edge Shoulder",
    roadClass: "highway",
    priorityRank: 3,
    lengthKm: 0.7,
    coordinates: [
      { lat: 30.2858, lon: 78.9827 },
      { lat: 30.2848, lon: 78.9809 },
      { lat: 30.2834, lon: 78.9796 }
    ]
  },
  {
    id: "segment-rudraprayag-market-link",
    zoneId: "zone-rudraprayag-nh",
    name: "Market Connector",
    roadClass: "connector",
    priorityRank: 1,
    lengthKm: 0.9,
    coordinates: [
      { lat: 30.2844, lon: 78.9811 },
      { lat: 30.2829, lon: 78.9794 },
      { lat: 30.2812, lon: 78.9779 }
    ]
  },
  {
    id: "segment-rudraprayag-hall-approach",
    zoneId: "zone-rudraprayag-nh",
    name: "Community Hall Approach",
    roadClass: "local",
    priorityRank: 2,
    lengthKm: 0.4,
    coordinates: [
      { lat: 30.2812, lon: 78.9779 },
      { lat: 30.2804, lon: 78.9771 },
      { lat: 30.2798, lon: 78.9764 }
    ]
  },
  {
    id: "segment-uttarkashi-drainage-edge",
    zoneId: "zone-uttarkashi-ridge",
    name: "Drainage Edge Footpath",
    roadClass: "local",
    priorityRank: 3,
    lengthKm: 0.6,
    coordinates: [
      { lat: 30.7267, lon: 78.4413 },
      { lat: 30.7249, lon: 78.4398 },
      { lat: 30.7237, lon: 78.4388 }
    ]
  },
  {
    id: "segment-uttarkashi-descent",
    zoneId: "zone-uttarkashi-ridge",
    name: "Main Descent Road",
    roadClass: "connector",
    priorityRank: 1,
    lengthKm: 1.3,
    coordinates: [
      { lat: 30.728, lon: 78.443 },
      { lat: 30.7252, lon: 78.4405 },
      { lat: 30.7232, lon: 78.4389 }
    ]
  },
  {
    id: "segment-uttarkashi-ground-link",
    zoneId: "zone-uttarkashi-ridge",
    name: "Relief Ground Link",
    roadClass: "local",
    priorityRank: 2,
    lengthKm: 0.7,
    coordinates: [
      { lat: 30.7232, lon: 78.4389 },
      { lat: 30.7222, lon: 78.4381 },
      { lat: 30.7216, lon: 78.4374 }
    ]
  }
];

export const seedRoadConditions: RoadCondition[] = [
  {
    id: "road-condition-joshimath-upper-cut",
    segmentId: "segment-joshimath-upper-cut",
    zoneId: "zone-joshimath-core",
    status: "blocked",
    averageSpeedKmph: 0,
    delayMinutes: 25,
    severityPct: 92,
    source: "seed",
    note: "Fresh debris has closed the upper shortcut.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-joshimath-main-road",
    segmentId: "segment-joshimath-main-road",
    zoneId: "zone-joshimath-core",
    status: "caution",
    averageSpeedKmph: 12,
    delayMinutes: 6,
    severityPct: 44,
    source: "seed",
    note: "One debris-prone bend requires slower movement.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-joshimath-college-approach",
    segmentId: "segment-joshimath-college-approach",
    zoneId: "zone-joshimath-core",
    status: "open",
    averageSpeedKmph: 18,
    delayMinutes: 1,
    severityPct: 10,
    source: "seed",
    note: "Shelter approach remains open.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-helang-upper-bend",
    segmentId: "segment-helang-upper-bend",
    zoneId: "zone-helang-slope",
    status: "blocked",
    averageSpeedKmph: 0,
    delayMinutes: 18,
    severityPct: 84,
    source: "seed",
    note: "Rockfall blocks the upper bend.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-helang-lower-road",
    segmentId: "segment-helang-lower-road",
    zoneId: "zone-helang-slope",
    status: "caution",
    averageSpeedKmph: 14,
    delayMinutes: 5,
    severityPct: 36,
    source: "seed",
    note: "Loose gravel on the shoulder after rainfall.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-helang-school-link",
    segmentId: "segment-helang-school-link",
    zoneId: "zone-helang-slope",
    status: "open",
    averageSpeedKmph: 17,
    delayMinutes: 1,
    severityPct: 8,
    source: "seed",
    note: "School approach is passable.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-rudraprayag-river-edge",
    segmentId: "segment-rudraprayag-river-edge",
    zoneId: "zone-rudraprayag-nh",
    status: "flooded",
    averageSpeedKmph: 4,
    delayMinutes: 12,
    severityPct: 71,
    source: "seed",
    note: "Water and mud cover the river-side shoulder.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-rudraprayag-market-link",
    segmentId: "segment-rudraprayag-market-link",
    zoneId: "zone-rudraprayag-nh",
    status: "open",
    averageSpeedKmph: 20,
    delayMinutes: 2,
    severityPct: 12,
    source: "seed",
    note: "Market connector is the recommended path.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-rudraprayag-hall-approach",
    segmentId: "segment-rudraprayag-hall-approach",
    zoneId: "zone-rudraprayag-nh",
    status: "open",
    averageSpeedKmph: 18,
    delayMinutes: 1,
    severityPct: 7,
    source: "seed",
    note: "Community hall approach is open.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-uttarkashi-drainage-edge",
    segmentId: "segment-uttarkashi-drainage-edge",
    zoneId: "zone-uttarkashi-ridge",
    status: "blocked",
    averageSpeedKmph: 0,
    delayMinutes: 21,
    severityPct: 89,
    source: "seed",
    note: "Footpath is unsafe due to drainage overflow.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-uttarkashi-descent",
    segmentId: "segment-uttarkashi-descent",
    zoneId: "zone-uttarkashi-ridge",
    status: "caution",
    averageSpeedKmph: 11,
    delayMinutes: 7,
    severityPct: 42,
    source: "seed",
    note: "Descending curve is narrow and slippery.",
    updatedAt: nowIso()
  },
  {
    id: "road-condition-uttarkashi-ground-link",
    segmentId: "segment-uttarkashi-ground-link",
    zoneId: "zone-uttarkashi-ridge",
    status: "open",
    averageSpeedKmph: 16,
    delayMinutes: 2,
    severityPct: 15,
    source: "seed",
    note: "Relief ground link remains open.",
    updatedAt: nowIso()
  }
];

export const seedElevationProfiles: Record<string, ElevationProfile> = {
  "zone-joshimath-core": {
    zoneId: "zone-joshimath-core",
    safeShelterId: "shelter-joshimath-college",
    minElevationM: 1915,
    maxElevationM: 2012,
    totalAscentM: 28,
    totalDescentM: 96,
    valleyExposure: "moderate",
    recommendedDirectionLabel: "Descend on the southbound road toward the college plateau.",
    points: [
      { distanceKm: 0, elevationM: 2011, slopeDegrees: 14 },
      { distanceKm: 0.4, elevationM: 1984, slopeDegrees: 18 },
      { distanceKm: 0.9, elevationM: 1958, slopeDegrees: 16 },
      { distanceKm: 1.4, elevationM: 1923, slopeDegrees: 11 },
      { distanceKm: 1.8, elevationM: 1915, slopeDegrees: 7 }
    ]
  },
  "zone-helang-slope": {
    zoneId: "zone-helang-slope",
    safeShelterId: "shelter-helang-school",
    minElevationM: 1542,
    maxElevationM: 1611,
    totalAscentM: 14,
    totalDescentM: 72,
    valleyExposure: "moderate",
    recommendedDirectionLabel: "Keep to the lower road and avoid the upper cut-slope bend.",
    points: [
      { distanceKm: 0, elevationM: 1608, slopeDegrees: 13 },
      { distanceKm: 0.3, elevationM: 1589, slopeDegrees: 17 },
      { distanceKm: 0.6, elevationM: 1565, slopeDegrees: 16 },
      { distanceKm: 0.9, elevationM: 1548, slopeDegrees: 9 },
      { distanceKm: 1.2, elevationM: 1542, slopeDegrees: 5 }
    ]
  },
  "zone-rudraprayag-nh": {
    zoneId: "zone-rudraprayag-nh",
    safeShelterId: "shelter-rudraprayag-hall",
    minElevationM: 904,
    maxElevationM: 965,
    totalAscentM: 18,
    totalDescentM: 61,
    valleyExposure: "low",
    recommendedDirectionLabel: "Use the market connector and stay above the river-side shoulder.",
    points: [
      { distanceKm: 0, elevationM: 962, slopeDegrees: 10 },
      { distanceKm: 0.4, elevationM: 948, slopeDegrees: 12 },
      { distanceKm: 0.8, elevationM: 931, slopeDegrees: 11 },
      { distanceKm: 1.2, elevationM: 914, slopeDegrees: 8 },
      { distanceKm: 1.5, elevationM: 904, slopeDegrees: 6 }
    ]
  },
  "zone-uttarkashi-ridge": {
    zoneId: "zone-uttarkashi-ridge",
    safeShelterId: "shelter-uttarkashi-ground",
    minElevationM: 1165,
    maxElevationM: 1294,
    totalAscentM: 10,
    totalDescentM: 122,
    valleyExposure: "high",
    recommendedDirectionLabel: "Descend only on the main road and do not drop toward the drainage footpath.",
    points: [
      { distanceKm: 0, elevationM: 1287, slopeDegrees: 18 },
      { distanceKm: 0.5, elevationM: 1248, slopeDegrees: 19 },
      { distanceKm: 1, elevationM: 1216, slopeDegrees: 16 },
      { distanceKm: 1.5, elevationM: 1188, slopeDegrees: 11 },
      { distanceKm: 2, elevationM: 1165, slopeDegrees: 8 }
    ]
  }
};

export const seedPredictions: Record<string, PredictionCore> = Object.fromEntries(
  seedZones.map((zone) => {
    const riskScore = Math.min(100, Math.round(zone.riskPriority * 8));
    return [
      zone.id,
      {
        zoneId: zone.id,
        riskScore,
        riskLevel: scoreToLevel(riskScore),
        predictedAt: nowIso(),
        soilMoistureProxyPct: 20 + zone.riskPriority * 6,
        groundMovementProxyPct: 18 + zone.riskPriority * 5,
        topFeatures: [
          "historicalLandslideFrequency",
          "slopeDegrees",
          "rainfallMmHr"
        ]
      }
    ];
  })
);

export const seedForecasts: Record<string, ForecastPoint[]> = Object.fromEntries(
  seedZones.map((zone) => {
    const base = seedPredictions[zone.id].riskScore;
    const plusOne = Math.min(100, base + 6);
    const plusTwo = Math.min(100, base + 9);
    const current = Date.now();

    return [
      zone.id,
      [
        {
          zoneId: zone.id,
          horizonHours: 1,
          forecastFor: new Date(current + 60 * 60 * 1000).toISOString(),
          riskScore: plusOne,
          riskLevel: scoreToLevel(plusOne),
          soilMoistureProxyPct: Math.min(100, 26 + zone.riskPriority * 7)
        },
        {
          zoneId: zone.id,
          horizonHours: 2,
          forecastFor: new Date(current + 2 * 60 * 60 * 1000).toISOString(),
          riskScore: plusTwo,
          riskLevel: scoreToLevel(plusTwo),
          soilMoistureProxyPct: Math.min(100, 30 + zone.riskPriority * 8)
        }
      ]
    ];
  })
);

export const seedWeather: Record<string, LiveWeather> = Object.fromEntries(
  seedZones.map((zone) => [
    zone.id,
    {
      zoneId: zone.id,
      rainfallMmHr: Number((zone.riskPriority * 4.5).toFixed(1)),
      observedAt: nowIso(),
      source: "seed",
      isStale: false
    }
  ])
);

export const seedHotspots: Hotspot[] = seedZones.map((zone) => {
  const prediction = seedPredictions[zone.id];
  const forecast = seedForecasts[zone.id][0];

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    districtName: zone.districtName,
    riskScore: prediction.riskScore,
    riskLevel: prediction.riskLevel,
    trend: forecast.riskScore > prediction.riskScore ? "rising" : "steady",
    nextHorizonLevel: forecast.riskLevel
  };
});

export const seedSubscriptions: Subscription[] = [
  {
    id: "sub-alert-test-8958688502",
    zoneId: "zone-joshimath-core",
    phoneNumber: "+918958688502",
    channels: ["SMS", "WHATSAPP"],
    appLanguage: "hi-x-garhwali",
    alertLanguage: "hi-x-garhwali",
    isActive: true,
    createdAt: nowIso()
  },
  {
    id: "sub-alert-test-7983025810",
    zoneId: "zone-joshimath-core",
    phoneNumber: "+917983025810",
    channels: ["SMS", "WHATSAPP"],
    appLanguage: "hi",
    alertLanguage: "hi",
    isActive: true,
    createdAt: nowIso()
  },
  {
    id: "sub-alert-test-english",
    zoneId: "zone-joshimath-core",
    phoneNumber: "+919999999911",
    channels: ["SMS"],
    appLanguage: "en",
    alertLanguage: "en",
    isActive: true,
    createdAt: nowIso()
  },
  {
    id: "sub-alert-test-kumaoni",
    zoneId: "zone-joshimath-core",
    phoneNumber: "+919999999912",
    channels: ["WHATSAPP"],
    appLanguage: "hi-x-kumaoni",
    alertLanguage: "hi-x-kumaoni",
    isActive: true,
    createdAt: nowIso()
  }
];

export const seedMediaReports: MediaReport[] = [
  {
    id: "report-joshimath-001",
    zoneId: "zone-joshimath-core",
    zoneName: "Joshimath Core",
    districtId: "dist-chamoli",
    mediaType: "photo",
    fileName: "joshimath-road-crack.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 742310,
    lat: 30.5562,
    lon: 79.5639,
    accuracyMeters: 18,
    deviceTimestamp: nowIso(),
    serverReceivedAt: nowIso(),
    description: "Fresh debris and road crack near the slope cut.",
    language: "en",
    verificationStatus: "verified",
    verificationScore: 0.83,
    aiLabels: ["debris", "road", "crack"],
    aiFlags: [],
    privacyStatus: "clear",
    faceBlurApplied: false,
    storageProvider: null,
    storageBucket: null,
    storageObjectPath: null,
    thumbnailBucket: null,
    thumbnailObjectPath: null,
    duplicateHash: "seedhash-joshimath-001",
    reviewNotes: "Verified from field pattern and location proximity.",
    reviewedAt: nowIso(),
    riskBoostApplied: true,
    riskBoostAmount: 0.12,
    riskBoostExpiresAt: inHoursIso(2),
    verificationBreakdown: {
      components: [
        {
          key: "evidence",
          label: "Landslide evidence",
          score: 0.9,
          weight: 0.5,
          weightedScore: 0.45,
          note: "Description strongly points to debris and visible cracking."
        },
        {
          key: "freshness",
          label: "Freshness",
          score: 0.96,
          weight: 0.25,
          weightedScore: 0.24,
          note: "Capture time is recent."
        },
        {
          key: "location",
          label: "Location match",
          score: 0.88,
          weight: 0.25,
          weightedScore: 0.22,
          note: "Upload is close to the affected zone center."
        }
      ],
      totalScore: 0.91,
      needsManualReview: false,
      summary: "Automatic verification confidence is high enough to contribute to zone risk."
    },
    uploadedByPhoneHash: "seed-phone-hash-001"
  },
  {
    id: "report-rudraprayag-001",
    zoneId: "zone-rudraprayag-nh",
    zoneName: "Rudraprayag NH Corridor",
    districtId: "dist-rudraprayag",
    mediaType: "video",
    fileName: "nh-slip-clip.mp4",
    mimeType: "video/mp4",
    fileSizeBytes: 4812000,
    lat: 30.2852,
    lon: 78.9801,
    accuracyMeters: 24,
    deviceTimestamp: nowIso(),
    serverReceivedAt: nowIso(),
    description: "Short clip of falling mud near the road edge.",
    language: "hi",
    verificationStatus: "unverified",
    verificationScore: 0.64,
    aiLabels: ["mud", "road"],
    aiFlags: ["face_blur_recommended"],
    privacyStatus: "blur_recommended",
    faceBlurApplied: false,
    storageProvider: null,
    storageBucket: null,
    storageObjectPath: null,
    thumbnailBucket: null,
    thumbnailObjectPath: null,
    duplicateHash: "seedhash-rudraprayag-001",
    reviewNotes: "",
    reviewedAt: null,
    riskBoostApplied: false,
    riskBoostAmount: 0,
    riskBoostExpiresAt: null,
    verificationBreakdown: {
      components: [
        {
          key: "evidence",
          label: "Landslide evidence",
          score: 0.72,
          weight: 0.5,
          weightedScore: 0.36,
          note: "Description mentions mud movement near the road."
        },
        {
          key: "freshness",
          label: "Freshness",
          score: 0.8,
          weight: 0.25,
          weightedScore: 0.2,
          note: "Capture time looks recent."
        },
        {
          key: "location",
          label: "Location match",
          score: 0.76,
          weight: 0.25,
          weightedScore: 0.19,
          note: "Upload appears reasonably close to the mapped zone."
        }
      ],
      totalScore: 0.75,
      needsManualReview: true,
      summary: "Automatic scoring found useful evidence, but manual review is still required."
    },
    uploadedByPhoneHash: "seed-phone-hash-002"
  }
];
