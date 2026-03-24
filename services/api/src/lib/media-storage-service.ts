import fs from "fs";
import path from "path";
import { Response } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MediaReport, MediaStorageProvider } from "@bhurakshan/contracts";
import { env } from "../config/env";

type StoreMediaUploadInput = {
  reportId: string;
  zoneId: string;
  mediaType: MediaReport["mediaType"];
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

type StoredMediaDescriptor = {
  storageProvider: MediaStorageProvider;
  storageBucket: string | null;
  storageObjectPath: string | null;
  thumbnailBucket: string | null;
  thumbnailObjectPath: string | null;
};

const runtimeUploadsDir = path.resolve(__dirname, "../../../../.runtime/media-uploads");

export class MediaStorageService {
  private readonly supabase: SupabaseClient | null;

  constructor() {
    this.supabase =
      env.supabaseUrl && env.supabaseServiceKey
        ? createClient(env.supabaseUrl, env.supabaseServiceKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          })
        : null;
  }

  public async storeUpload(input: StoreMediaUploadInput): Promise<StoredMediaDescriptor> {
    if (this.supabase) {
      try {
        return await this.storeInSupabase(input);
      } catch (error) {
        console.warn("[media-storage] supabase upload failed, falling back to runtime storage", error);
      }
    }

    return this.storeInRuntime(input);
  }

  public async createSignedAssetUrls(report: MediaReport, expiresInSeconds: number) {
    if (
      report.storageProvider === "supabase" &&
      this.supabase &&
      report.storageBucket &&
      report.storageObjectPath
    ) {
      const mediaUrl = await this.createSupabaseSignedUrl(
        report.storageBucket,
        report.storageObjectPath,
        expiresInSeconds
      );
      const thumbnailUrl =
        report.thumbnailBucket && report.thumbnailObjectPath
          ? await this.createSupabaseSignedUrl(
              report.thumbnailBucket,
              report.thumbnailObjectPath,
              expiresInSeconds
            )
          : report.mediaType === "photo"
            ? mediaUrl
            : null;

      return {
        available: Boolean(mediaUrl),
        provider: report.storageProvider,
        mediaUrl,
        thumbnailUrl,
        expiresInSeconds
      };
    }

    if (
      report.storageProvider === "runtime_local" &&
      report.storageObjectPath &&
      this.getRuntimeAbsolutePath(report.storageObjectPath)
    ) {
      return {
        available: true,
        provider: report.storageProvider,
        mediaUrl: null,
        thumbnailUrl: report.mediaType === "photo" ? null : null,
        expiresInSeconds
      };
    }

    return {
      available: false,
      provider: report.storageProvider ?? null,
      mediaUrl: null,
      thumbnailUrl: null,
      expiresInSeconds
    };
  }

  public async streamRuntimeMedia(report: MediaReport, res: Response) {
    if (report.storageProvider !== "runtime_local" || !report.storageObjectPath) {
      return false;
    }

    const absolutePath = this.getRuntimeAbsolutePath(report.storageObjectPath);

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return false;
    }

    res.setHeader("Content-Type", report.mimeType);
    res.setHeader("Content-Length", String(fs.statSync(absolutePath).size));
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Disposition", `inline; filename="${encodeSafeFileName(report.fileName)}"`);
    fs.createReadStream(absolutePath).pipe(res);
    return true;
  }

  public async deleteStoredMedia(report: MediaReport) {
    if (report.storageProvider === "supabase" && this.supabase) {
      await this.deleteSupabaseObject(report.storageBucket, report.storageObjectPath);
      await this.deleteSupabaseObject(report.thumbnailBucket, report.thumbnailObjectPath);
      return;
    }

    if (report.storageProvider === "runtime_local" && report.storageObjectPath) {
      const absolutePath = this.getRuntimeAbsolutePath(report.storageObjectPath);
      if (absolutePath && fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }
  }

  private async storeInSupabase(input: StoreMediaUploadInput): Promise<StoredMediaDescriptor> {
    if (!this.supabase) {
      throw new Error("Supabase storage is not configured.");
    }

    const objectPath = buildStorageObjectPath(input.zoneId, input.reportId, input.fileName);
    const { error } = await this.supabase.storage.from(env.mediaBucket).upload(objectPath, input.buffer, {
      contentType: input.mimeType,
      upsert: false
    });

    if (error) {
      throw error;
    }

    return {
      storageProvider: "supabase",
      storageBucket: env.mediaBucket,
      storageObjectPath: objectPath,
      thumbnailBucket: null,
      thumbnailObjectPath: null
    };
  }

  private async storeInRuntime(input: StoreMediaUploadInput): Promise<StoredMediaDescriptor> {
    const objectPath = buildStorageObjectPath(input.zoneId, input.reportId, input.fileName);
    const absolutePath = path.join(runtimeUploadsDir, objectPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, input.buffer);

    return {
      storageProvider: "runtime_local",
      storageBucket: null,
      storageObjectPath: objectPath,
      thumbnailBucket: null,
      thumbnailObjectPath: null
    };
  }

  private async createSupabaseSignedUrl(
    bucket: string,
    objectPath: string,
    expiresInSeconds: number
  ) {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error) {
      console.warn("[media-storage] failed to create signed URL", error);
      return null;
    }

    return data.signedUrl;
  }

  private async deleteSupabaseObject(bucket: string | null, objectPath: string | null) {
    if (!this.supabase || !bucket || !objectPath) {
      return;
    }

    const { error } = await this.supabase.storage.from(bucket).remove([objectPath]);

    if (error) {
      console.warn("[media-storage] failed to delete stored object", error);
    }
  }

  private getRuntimeAbsolutePath(objectPath: string) {
    const absolutePath = path.join(runtimeUploadsDir, objectPath);
    const resolvedPath = path.resolve(absolutePath);

    if (!resolvedPath.startsWith(path.resolve(runtimeUploadsDir))) {
      return null;
    }

    return resolvedPath;
  }
}

function buildStorageObjectPath(zoneId: string, reportId: string, fileName: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const sanitizedFileName = encodeSafeFileName(fileName);
  return `${zoneId}/${year}/${month}/${reportId}-${sanitizedFileName}`;
}

function encodeSafeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "upload.bin";
}
