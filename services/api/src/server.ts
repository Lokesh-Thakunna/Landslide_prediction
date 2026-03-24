import http from "http";
import { createAppContext } from "./app";
import { env } from "./config/env";

const { app, realtimeServer } = createAppContext();
const server = http.createServer(app);

realtimeServer.attach(server);

server.on("error", (error) => {
  void handleServerError(error);
});

server.listen(env.port, () => {
  console.log(`BHURAKSHAN API listening on http://localhost:${env.port}`);
  console.log("Demo credentials:");
  console.log("  admin@bhurakshan.local / Admin@123");
  console.log("  chamoli.ops@bhurakshan.local / Chamoli@123");
  console.log("  analyst@bhurakshan.local / Analyst@123");
});

async function handleServerError(error: NodeJS.ErrnoException) {
  if (error.code === "EADDRINUSE") {
    const existingApi = await checkExistingApi(env.port);

    if (existingApi) {
      console.log(`BHURAKSHAN API is already running on http://localhost:${env.port}`);
      process.exit(0);
      return;
    }

    console.error(
      `Port ${env.port} is already in use by another process. Stop that process or set PORT to a different value in .env.`
    );
    process.exit(1);
    return;
  }

  throw error;
}

async function checkExistingApi(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { status?: string };
    return payload.status === "ok";
  } catch {
    return false;
  }
}
