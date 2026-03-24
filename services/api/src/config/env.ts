import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const splitCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  corsOrigins: splitCsv(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
  ]),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  jwtFallbackSecret: process.env.JWT_SECRET ?? "bhurakshan-dev-secret",
  internalServiceApiKey:
    process.env.INTERNAL_SERVICE_API_KEY ?? "bhurakshan-local-internal-key",
  phoneEncryptionKey: process.env.PHONE_ENCRYPTION_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  mediaBucket: process.env.MEDIA_BUCKET ?? "hhlews-media-reports",
  thumbnailBucket: process.env.THUMBNAIL_BUCKET ?? "hhlews-thumbnails",
  maxPhotoSizeMb: Number(process.env.MAX_PHOTO_SIZE_MB ?? 10),
  maxVideoSizeMb: Number(process.env.MAX_VIDEO_SIZE_MB ?? 50),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioSmsFrom: process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_PHONE_NUMBER,
  twilioWhatsappFrom:
    process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_WHATSAPP_NUMBER
};
