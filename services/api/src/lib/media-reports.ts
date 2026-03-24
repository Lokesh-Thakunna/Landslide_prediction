import crypto from "crypto";
import type {
  MediaReport,
  MediaVerificationBreakdown,
  MediaType,
  MediaVerificationStatus,
  ZoneStatic
} from "@bhurakshan/contracts";
import { haversineKm } from "./geo";

const LANDSLIDE_KEYWORDS = [
  "landslide",
  "rock",
  "debris",
  "mud",
  "slide",
  "crack",
  "slope",
  "भूस्खलन",
  "मलबा",
  "दरार",
  "पहाड़",
  "धांस"
];
const ABUSIVE_KEYWORDS = [
  "fake",
  "fraud",
  "idiot",
  "stupid",
  "abuse",
  "spam",
  "bakwas",
  "फेक",
  "फ्रॉड",
  "बकवास"
];
const PRIVACY_KEYWORDS = [
  "face",
  "person",
  "people",
  "child",
  "family",
  "crowd",
  "selfie",
  "चेहरा",
  "बच्चा",
  "परिवार",
  "लोग"
];
const CONTACT_PATTERN =
  /(\+?\d[\d\s-]{7,}\d)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(https?:\/\/\S+)/i;
const MODERATION_REVIEW_FLAGS = new Set([
  "contact_info_in_description",
  "abusive_language",
  "face_blur_recommended",
  "stale_capture_timestamp",
  "future_device_timestamp"
]);
export const MEDIA_RISK_BOOST_TTL_HOURS = 2;

export function buildDuplicateHash(fileName: string, fileSizeBytes: number, description: string) {
  return crypto
    .createHash("sha256")
    .update(`${fileName}:${fileSizeBytes}:${description}`)
    .digest("hex")
    .slice(0, 32);
}

export function inferMediaVerification(input: {
  fileName: string;
  mediaType: MediaType;
  fileSizeBytes: number;
  description: string;
  deviceTimestamp?: string;
  lat: number;
  lon: number;
  zone: ZoneStatic;
  duplicateHashes: string[];
}) {
  const description = input.description.trim().toLowerCase();
  const matchedLabels = LANDSLIDE_KEYWORDS.filter((keyword) => description.includes(keyword));
  const duplicateHash = buildDuplicateHash(input.fileName, input.fileSizeBytes, input.description);
  const breakdown = buildVerificationBreakdown({
    mediaType: input.mediaType,
    matchedLabelCount: matchedLabels.length,
    deviceTimestamp: input.deviceTimestamp,
    lat: input.lat,
    lon: input.lon,
    zone: input.zone,
    needsManualReview: false
  });

  if (input.duplicateHashes.includes(duplicateHash)) {
    return {
      verificationStatus: "duplicate" as MediaVerificationStatus,
      verificationScore: 0,
      aiLabels: matchedLabels,
      aiFlags: ["duplicate_submission"],
      duplicateHash,
      riskBoostApplied: false,
      riskBoostAmount: 0,
      riskBoostExpiresAt: null,
      verificationBreakdown: {
        ...breakdown,
        totalScore: 0,
        summary: "This upload matches a recently submitted report and was treated as a duplicate."
      }
    };
  }

  const aiFlags: string[] = [];
  const hasContactInfo = CONTACT_PATTERN.test(input.description);
  const hasAbusiveLanguage = ABUSIVE_KEYWORDS.some((keyword) => description.includes(keyword));
  const hasPrivacyMarkers = PRIVACY_KEYWORDS.some((keyword) => description.includes(keyword));
  const captureTimestampAge = getCaptureTimestampAgeHours(input.deviceTimestamp);
  const hasFutureTimestamp = typeof captureTimestampAge === "number" && captureTimestampAge < -0.17;
  const hasStaleTimestamp = typeof captureTimestampAge === "number" && captureTimestampAge > 6;

  if (!matchedLabels.length) {
    aiFlags.push("low_context_description");
  }

  if (hasContactInfo) {
    aiFlags.push("contact_info_in_description");
  }

  if (hasAbusiveLanguage) {
    aiFlags.push("abusive_language");
  }

  if (hasPrivacyMarkers) {
    aiFlags.push("face_blur_recommended");
  }

  if (hasStaleTimestamp) {
    aiFlags.push("stale_capture_timestamp");
  }

  if (hasFutureTimestamp) {
    aiFlags.push("future_device_timestamp");
  }

  const needsManualReview = aiFlags.some((flag) => MODERATION_REVIEW_FLAGS.has(flag));
  const moderatedBreakdown = buildVerificationBreakdown({
    mediaType: input.mediaType,
    matchedLabelCount: matchedLabels.length,
    deviceTimestamp: input.deviceTimestamp,
    lat: input.lat,
    lon: input.lon,
    zone: input.zone,
    needsManualReview
  });
  const score = moderatedBreakdown.totalScore;

  if (needsManualReview) {
    return {
      verificationStatus: "unverified" as MediaVerificationStatus,
      verificationScore: score,
      aiLabels: matchedLabels,
      aiFlags,
      duplicateHash,
      riskBoostApplied: false,
      riskBoostAmount: 0,
      riskBoostExpiresAt: null,
      verificationBreakdown: moderatedBreakdown
    };
  }

  if (score >= 0.75) {
    return {
      verificationStatus: "verified" as MediaVerificationStatus,
      verificationScore: score,
      aiLabels: matchedLabels,
      aiFlags,
      duplicateHash,
      riskBoostApplied: true,
      riskBoostAmount: Number(Math.min(0.15, score * 0.15).toFixed(2)),
      riskBoostExpiresAt: buildRiskBoostExpiresAt(),
      verificationBreakdown: moderatedBreakdown
    };
  }

  return {
    verificationStatus: "unverified" as MediaVerificationStatus,
    verificationScore: score,
    aiLabels: matchedLabels,
    aiFlags,
    duplicateHash,
    riskBoostApplied: false,
    riskBoostAmount: 0,
    riskBoostExpiresAt: null,
    verificationBreakdown: moderatedBreakdown
  };
}

export function buildMediaStatusMessage(report: MediaReport) {
  switch (report.verificationStatus) {
    case "verified":
      return "Your report was verified and shared with officials.";
    case "duplicate":
      return "This report looks similar to a recently submitted report.";
    case "fake":
      return "This report was flagged and needs manual review.";
    case "unverified":
      return "Your report was received and is waiting for official review.";
    case "pending":
    default:
      return "Your report was received. Verification is in progress.";
  }
}

function getCaptureTimestampAgeHours(deviceTimestamp?: string) {
  if (!deviceTimestamp) {
    return undefined;
  }

  const timestamp = new Date(deviceTimestamp).getTime();

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return (Date.now() - timestamp) / (60 * 60 * 1000);
}

function buildVerificationBreakdown(input: {
  mediaType: MediaType;
  matchedLabelCount: number;
  deviceTimestamp?: string;
  lat: number;
  lon: number;
  zone: ZoneStatic;
  needsManualReview: boolean;
}): MediaVerificationBreakdown {
  const evidenceScore = getEvidenceScore(input.mediaType, input.matchedLabelCount, input.zone.riskPriority);
  const freshnessScore = getFreshnessScore(input.deviceTimestamp);
  const locationDistanceKm = haversineKm(
    input.lat,
    input.lon,
    input.zone.centroidLat,
    input.zone.centroidLon
  );
  const locationScore = getLocationScore(locationDistanceKm);
  const components = [
    {
      key: "evidence" as const,
      label: "Landslide evidence",
      score: evidenceScore,
      weight: 0.5,
      weightedScore: round(evidenceScore * 0.5),
      note:
        input.matchedLabelCount > 0
          ? `Matched ${input.matchedLabelCount} landslide clues in the description.`
          : "No strong landslide clues were found in the description."
    },
    {
      key: "freshness" as const,
      label: "Freshness",
      score: freshnessScore,
      weight: 0.25,
      weightedScore: round(freshnessScore * 0.25),
      note: buildFreshnessNote(input.deviceTimestamp)
    },
    {
      key: "location" as const,
      label: "Location match",
      score: locationScore,
      weight: 0.25,
      weightedScore: round(locationScore * 0.25),
      note: `Upload is ${locationDistanceKm.toFixed(1)} km from the zone center.`
    }
  ];
  const totalScore = round(
    components.reduce((sum, component) => sum + component.weightedScore, 0)
  );

  return {
    components,
    totalScore,
    needsManualReview: input.needsManualReview,
    summary: input.needsManualReview
      ? "Automatic scoring found useful evidence, but manual review is still required."
      : totalScore >= 0.75
        ? "Automatic verification confidence is high enough to contribute to zone risk."
        : "Automatic verification confidence is moderate and still needs official confirmation."
  };
}

function getEvidenceScore(mediaType: MediaType, matchedLabelCount: number, riskPriority: number) {
  const baseScore = mediaType === "photo" ? 0.46 : 0.54;
  const keywordBoost = Math.min(0.32, matchedLabelCount * 0.11);
  const priorityBoost = Math.min(0.14, riskPriority * 0.02);
  return round(Math.min(0.98, baseScore + keywordBoost + priorityBoost));
}

function getFreshnessScore(deviceTimestamp?: string) {
  const ageHours = getCaptureTimestampAgeHours(deviceTimestamp);

  if (typeof ageHours !== "number") {
    return 0.55;
  }

  if (ageHours < -0.17) {
    return 0;
  }

  if (ageHours <= 1) {
    return 1;
  }

  if (ageHours <= 3) {
    return 0.85;
  }

  if (ageHours <= 6) {
    return 0.65;
  }

  if (ageHours <= 12) {
    return 0.35;
  }

  return 0.1;
}

function getLocationScore(distanceKm: number) {
  if (distanceKm <= 1.5) {
    return 1;
  }

  if (distanceKm <= 3) {
    return 0.85;
  }

  if (distanceKm <= 5) {
    return 0.68;
  }

  if (distanceKm <= 10) {
    return 0.45;
  }

  return 0.2;
}

function buildFreshnessNote(deviceTimestamp?: string) {
  const ageHours = getCaptureTimestampAgeHours(deviceTimestamp);

  if (typeof ageHours !== "number") {
    return "Device capture time was unavailable, so freshness was estimated conservatively.";
  }

  if (ageHours < -0.17) {
    return "Device timestamp appears to be in the future and needs manual review.";
  }

  if (ageHours <= 1) {
    return "Capture time is within the last hour.";
  }

  if (ageHours <= 6) {
    return `Capture time is about ${Math.round(ageHours)} hours old.`;
  }

  return `Capture time is about ${Math.round(ageHours)} hours old and may be stale.`;
}

function buildRiskBoostExpiresAt() {
  return new Date(Date.now() + MEDIA_RISK_BOOST_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function round(value: number) {
  return Number(value.toFixed(2));
}
