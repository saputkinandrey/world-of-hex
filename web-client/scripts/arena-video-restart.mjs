import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const pidPath = path.join(projectRoot, ".arena-video-server.pid");
const port = 3002;

const isListening = () =>
    new Promise((resolve) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => {
            socket.destroy();
            resolve(true);
        });
        socket.once("error", () => resolve(false));
    });

if (fs.existsSync(pidPath)) {
    const pid = Number.parseInt(fs.readFileSync(pidPath, "utf8"), 10);
    if (!Number.isInteger(pid) || pid <= 0) {
        throw new Error(`Invalid arena video server PID: ${pid}`);
    }
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        encoding: "utf8",
        windowsHide: true,
    });
    fs.rmSync(pidPath);
}

for (let attempt = 0; attempt < 20 && (await isListening()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
}
if (await isListening()) {
    throw new Error(
        `Port ${port} is occupied by an unmanaged process; refusing to stop an unknown process.`,
    );
}

const child = spawn(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/s", "/c", "npm.cmd run dev"],
    {
        cwd: projectRoot,
        detached: true,
        shell: false,
        stdio: "ignore",
        windowsHide: true,
    },
);
child.unref();
fs.writeFileSync(pidPath, String(child.pid), "utf8");
console.log(`Arena server restarted with PID ${child.pid}.`);
