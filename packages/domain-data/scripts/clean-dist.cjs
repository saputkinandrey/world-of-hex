const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const distPath = path.resolve(__dirname, "..", "dist");

if (process.platform === "win32") {
    execFileSync(
        "powershell.exe",
        [
            "-NoProfile",
            "-Command",
            "& { param($target) Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue }",
            distPath,
        ],
        { stdio: "inherit" },
    );
} else {
    fs.rmSync(distPath, { force: true, recursive: true });
}
