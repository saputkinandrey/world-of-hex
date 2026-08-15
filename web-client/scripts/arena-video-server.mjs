import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

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

if (await isListening()) {
    console.log(`Arena server is already listening on port ${port}.`);
    process.exit(0);
}

const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run dev"], {
    cwd: projectRoot,
    detached: true,
    shell: false,
    stdio: "ignore",
    windowsHide: true,
});
child.unref();
fs.writeFileSync(pidPath, String(child.pid), "utf8");
console.log(`Arena server started with PID ${child.pid}.`);
