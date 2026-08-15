import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const manifestPath = path.join(
    projectRoot,
    "artifacts",
    "arena-video-capture.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const artifactDirectory = path.resolve(projectRoot, manifest.artifactDirectory);
const framesDirectory = path.join(artifactDirectory, "frames");
const outputPath = path.join(artifactDirectory, manifest.outputFile);
const frameEntries = fs
    .readdirSync(framesDirectory)
    .filter((entry) => /^frame-\d{4}\.(png|jpg)$/i.test(entry))
    .sort();
if (frameEntries.length === 0) {
    throw new Error(`No captured frames found in ${framesDirectory}`);
}
const firstFrame = fs.readFileSync(path.join(framesDirectory, frameEntries[0]));
const framesAreJpeg = firstFrame[0] === 0xff && firstFrame[1] === 0xd8;
const frameExtension = framesAreJpeg ? "jpg" : "png";
if (framesAreJpeg) {
    frameEntries.forEach((entry) => {
        if (entry.toLowerCase().endsWith(".png")) {
            fs.renameSync(
                path.join(framesDirectory, entry),
                path.join(framesDirectory, entry.replace(/\.png$/i, ".jpg")),
            );
        }
    });
}
const binariesDirectory = path.join(
    projectRoot,
    ".video-tools",
    "imageio_ffmpeg",
    "binaries",
);
const ffmpegExecutable = fs
    .readdirSync(binariesDirectory)
    .find((entry) => entry.toLowerCase().endsWith(".exe"));

if (!ffmpegExecutable) {
    throw new Error(`FFmpeg executable not found in ${binariesDirectory}`);
}

const result = spawnSync(
    path.join(binariesDirectory, ffmpegExecutable),
    [
        "-y",
        "-framerate",
        String(manifest.framesPerSecond ?? 1),
        "-i",
        path.join(framesDirectory, `frame-%04d.${frameExtension}`),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        outputPath,
    ],
    { stdio: "inherit" },
);

if (result.status !== 0) {
    throw new Error(`FFmpeg failed with exit code ${result.status}`);
}

console.log(outputPath);
