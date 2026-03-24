import crypto from "crypto";
import pg from "pg";
import type { Subscription } from "@bhurakshan/contracts";
import { env } from "../config/env";
import { seedDistricts, seedZones } from "../data/seed";

const { Pool } = pg;

export class SubscriptionRepository {
  private readonly pool: any;
  private readonly encryptionKey: Buffer | null;
  private readonly ready: Promise<void>;
  private persistenceEnabled: boolean;

  constructor() {
    this.pool = env.databaseUrl ? new Pool({ connectionString: env.databaseUrl }) : null;
    this.encryptionKey = this.getEncryptionKey(env.phoneEncryptionKey);
    this.persistenceEnabled = Boolean(this.pool && this.encryptionKey);
    this.ready = this.persistenceEnabled
      ? this.ensureReferenceData().catch((error) => {
          this.disablePersistence(
            "PostgreSQL is unavailable. Subscriber DB persistence is disabled for this run.",
            error
          );
        })
      : Promise.resolve();
  }

  public async upsert(subscription: Subscription) {
    if (!this.pool || !this.encryptionKey || !this.persistenceEnabled) {
      return;
    }

    await this.ready;

    if (!this.persistenceEnabled) {
      return;
    }

    const phoneHash = this.hashPhoneNumber(subscription.phoneNumber);
    const encryptedPhone = this.encryptPhoneNumber(subscription.phoneNumber);
    const smsEnabled = subscription.channels.includes("SMS");
    const whatsappEnabled = subscription.channels.includes("WHATSAPP");

    try {
      await this.pool.query(
        `
          INSERT INTO subscribers (
            id,
            zone_id,
            phone_hash,
            phone_encrypted,
            channel_sms_enabled,
            channel_whatsapp_enabled,
            app_language,
            alert_language,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (phone_hash)
          DO UPDATE SET
            zone_id = EXCLUDED.zone_id,
            phone_encrypted = EXCLUDED.phone_encrypted,
            channel_sms_enabled = EXCLUDED.channel_sms_enabled,
            channel_whatsapp_enabled = EXCLUDED.channel_whatsapp_enabled,
            app_language = EXCLUDED.app_language,
            alert_language = EXCLUDED.alert_language,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `,
        [
          subscription.id,
          subscription.zoneId,
          phoneHash,
          encryptedPhone,
          smsEnabled,
          whatsappEnabled,
          subscription.appLanguage,
          subscription.alertLanguage,
          subscription.isActive
        ]
      );
    } catch (error) {
      this.disablePersistence(
        "PostgreSQL became unavailable while saving a subscription. Falling back to in-memory state only.",
        error
      );
    }
  }

  private hashPhoneNumber(phoneNumber: string) {
    return crypto.createHash("sha256").update(phoneNumber).digest("hex");
  }

  private async ensureReferenceData() {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.query("BEGIN");

      for (const district of seedDistricts) {
        await this.pool.query(
          `
            INSERT INTO districts (id, name, state_name, default_language)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              state_name = EXCLUDED.state_name,
              default_language = EXCLUDED.default_language,
              updated_at = NOW()
          `,
          [district.id, district.name, district.stateName, district.defaultLanguage]
        );
      }

      for (const zone of seedZones) {
        await this.pool.query(
          `
            INSERT INTO zones (
              id,
              district_id,
              name,
              centroid_lat,
              centroid_lon,
              slope_degrees,
              historical_landslide_frequency,
              risk_priority,
              is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              district_id = EXCLUDED.district_id,
              name = EXCLUDED.name,
              centroid_lat = EXCLUDED.centroid_lat,
              centroid_lon = EXCLUDED.centroid_lon,
              slope_degrees = EXCLUDED.slope_degrees,
              historical_landslide_frequency = EXCLUDED.historical_landslide_frequency,
              risk_priority = EXCLUDED.risk_priority,
              is_active = EXCLUDED.is_active,
              updated_at = NOW()
          `,
          [
            zone.id,
            zone.districtId,
            zone.name,
            zone.centroidLat,
            zone.centroidLon,
            zone.slopeDegrees,
            zone.historicalLandslideFrequency,
            zone.riskPriority,
            zone.isActive
          ]
        );
      }

      await this.pool.query("COMMIT");
    } catch (error) {
      try {
        await this.pool.query("ROLLBACK");
      } catch (rollbackError) {
        console.warn("Failed to rollback subscriber reference-data transaction.", rollbackError);
      }
      throw error;
    }
  }

  private disablePersistence(message: string, error: unknown) {
    if (!this.persistenceEnabled) {
      return;
    }

    this.persistenceEnabled = false;
    console.warn(message, error);

    try {
      void this.pool?.end();
    } catch (poolError) {
      console.warn("Failed to close PostgreSQL pool cleanly.", poolError);
    }
  }

  private encryptPhoneNumber(phoneNumber: string) {
    if (!this.encryptionKey) {
      throw new Error("PHONE_ENCRYPTION_KEY is not configured.");
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(phoneNumber, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  private getEncryptionKey(value: string | undefined) {
    if (!value) {
      console.warn("PHONE_ENCRYPTION_KEY is missing. Subscriber DB persistence is disabled.");
      return null;
    }

    try {
      const key = Buffer.from(value, "hex");

      if (key.length !== 32) {
        console.warn(
          "PHONE_ENCRYPTION_KEY must be a 32-byte hex string. Subscriber DB persistence is disabled."
        );
        return null;
      }

      return key;
    } catch (error) {
      console.warn("Invalid PHONE_ENCRYPTION_KEY. Subscriber DB persistence is disabled.", error);
      return null;
    }
  }
}
