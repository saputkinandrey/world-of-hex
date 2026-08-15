import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const pidPath = path.join(process.cwd(), ".arena-video-server.pid");

if (!fs.existsSync(pidPath)) {
    console.log("No arena video server PID file found.");
    process.exit(0);
}

const pid = Number.parseInt(fs.readFileSync(pidPath, "utf8"), 10);
if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Invalid arena video server PID: ${pid}`);
}

const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    encoding: "utf8",
    windowsHide: true,
});
if (result.status !== 0 && !/not found|not running/i.test(result.stderr ?? "")) {
    throw new Error(
        `Failed to stop arena video server ${pid}: ${result.stderr || result.stdout}`,
    );
}
console.log(`Arena video server process tree ${pid} stopped.`);
fs.rmSync(pidPath);
