import { spawnSync } from "node:child_process";
import path from "node:path";

const scriptName = process.argv[2];

if (!scriptName) {
  console.error("Usage: node run-wiki-script.mjs <script-name>");
  process.exit(1);
}

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, "hex-wiki", "scripts", scriptName);
const relativeScriptPath = path.posix.join(
  "hex-wiki",
  "scripts",
  scriptName.replace(/\\/g, "/"),
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });

  process.exit(result.status ?? 1);
}

function listWslDistros() {
  const result = spawnSync("wsl", ["-l", "-q"], {
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .replace(/\0/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findUbuntuDistro(distros) {
  const preferred = ["Ubuntu", "Ubuntu-24.04", "Ubuntu-22.04", "Ubuntu-20.04"];

  for (const name of preferred) {
    if (distros.includes(name)) {
      return name;
    }
  }

  return distros.find((name) => /^ubuntu/i.test(name));
}

function printWindowsWslHelp() {
  console.error("[FAIL] Ubuntu WSL distro not found.");
  console.error("");
  console.error("Your default WSL distro is likely docker-desktop, which cannot run Hex Wiki scripts.");
  console.error("");
  console.error("Install Ubuntu:");
  console.error("  wsl --install -d Ubuntu");
  console.error("");
  console.error("Then set it as default:")
  console.error("  wsl --set-default Ubuntu");
  console.error("");
  console.error("After that, from project root:");
  console.error("  npm.cmd run wiki:setup");
}

if (process.platform === "win32") {
  const ubuntuDistro = findUbuntuDistro(listWslDistros());

  if (!ubuntuDistro) {
    printWindowsWslHelp();
    process.exit(1);
  }

  run("wsl", [
    "-d",
    ubuntuDistro,
    "--cd",
    repoRoot,
    "--",
    "bash",
    relativeScriptPath,
  ]);
}

run("bash", [scriptPath]);
