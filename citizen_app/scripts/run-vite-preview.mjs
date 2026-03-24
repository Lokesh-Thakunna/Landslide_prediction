import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
const port = 5174;

await releasePort(port);
runVite(["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"]);

function runVite(args) {
  const child = spawn(process.execPath, [viteBin, ...args], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function releasePort(targetPort) {
  if (process.platform !== "win32") {
    return;
  }

  const command = [
    "$connections = Get-NetTCPConnection -LocalPort " + targetPort + " -State Listen -ErrorAction SilentlyContinue;",
    "if ($connections) {",
    "  $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {",
    "    $process = Get-Process -Id $_ -ErrorAction SilentlyContinue;",
    "    if ($process -and $process.ProcessName -eq 'node') { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }",
    "  }",
    "}"
  ].join(" ");

  await runPowerShell(command);
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], {
      stdio: "ignore"
    });

    child.on("exit", () => {
      resolve();
    });
    child.on("error", reject);
  });
}
