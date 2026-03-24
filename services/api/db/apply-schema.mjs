import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
const rootEnvPath = path.join(projectRoot, ".env");
dotenv.config({ path: rootEnvPath });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);

  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'districts',
        'zones',
        'rainfall_readings',
        'risk_predictions',
        'forecast_snapshots',
        'safe_shelters',
        'evacuation_routes',
        'subscribers',
        'alert_events',
        'users',
        'audit_logs'
      )
    ORDER BY table_name;
  `);

  console.log("Schema applied successfully.");
  console.table(result.rows);
} catch (error) {
  console.error("Failed to apply schema.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
