import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const artifactName = process.argv[2] ?? "arena-43117-cohesion";
if (!/^[a-z0-9-]+$/.test(artifactName)) {
    throw new Error("Artifact name may contain only lowercase ASCII letters, digits, and hyphens.");
}

const artifactDirectory = path.join(projectRoot, "artifacts", artifactName);
const framesDirectory = path.join(artifactDirectory, "frames");
fs.mkdirSync(framesDirectory, { recursive: true });
fs.writeFileSync(
    path.join(projectRoot, "artifacts", "arena-video-capture.json"),
    JSON.stringify(
        {
            artifactDirectory: path.relative(projectRoot, artifactDirectory),
            outputFile: `${artifactName}.mp4`,
            framesPerSecond: 1,
        },
        null,
        2,
    ),
    "utf8",
);
console.log(framesDirectory);
