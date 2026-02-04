import chokidar from "chokidar";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    args.set(key.slice(2), value ?? "true");
  }
}

const port = Number(args.get("port") ?? process.env.PORT ?? 3001);
const debounceMs = Number(args.get("debounce") ?? 5000);
const watchTargets = [
  "app",
  "pages",
  "src",
  "components",
  "public",
  "next.config.js",
  "tsconfig.json",
  ".env",
  ".env.local",
];

const nextBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const spawnCommand = (command, argsList, options) => {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/c", command, ...argsList], options);
  }
  return spawn(command, argsList, options);
};

const log = (message) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[next-watch ${ts}] ${message}`);
};

let serverProcess = null;
let building = false;
let queued = false;
let timer = null;

const stopServer = async () => {
  if (!serverProcess) return;
  const proc = serverProcess;
  serverProcess = null;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", [
        "/PID",
        String(proc.pid),
        "/T",
        "/F",
      ]);
      killer.on("close", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  await new Promise((resolve) => {
    proc.once("exit", resolve);
    proc.kill("SIGTERM");
    setTimeout(() => resolve(), 2000).unref();
  });
};

const startServer = () => {
  serverProcess = spawnCommand(
    nextBin,
    ["start", "-p", String(port)],
    { cwd: projectRoot, stdio: "inherit" },
  );
};

const runBuild = () =>
  new Promise((resolve, reject) => {
    log("building...");
    const proc = spawnCommand(nextBin, ["build"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    proc.on("exit", (code) => {
      if (code === 0) {
        log("build complete");
        resolve();
        return;
      }
      reject(new Error(`build failed with code ${code}`));
    });
  });

const rebuild = async () => {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    await runBuild();
    await stopServer();
    startServer();
  } catch (err) {
    log(String(err));
  } finally {
    building = false;
    if (queued) {
      queued = false;
      scheduleBuild();
    }
  }
};

const scheduleBuild = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void rebuild();
  }, debounceMs);
};

const main = async () => {
  log(`starting watch with debounce ${debounceMs}ms`);
  await runBuild();
  startServer();

  const watcher = chokidar.watch(watchTargets, {
    cwd: projectRoot,
    ignoreInitial: true,
    ignored: ["**/.next/**", "**/node_modules/**", "**/.git/**"],
  });

  watcher.on("all", (event, changedPath) => {
    log(`${event} ${changedPath}`);
    scheduleBuild();
  });

  const shutdown = async () => {
    await watcher.close();
    await stopServer();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
};

void main();
