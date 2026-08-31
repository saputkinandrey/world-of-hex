import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

const compileArenaEngine = (projectRoot) => {
    const sourceDirectory = path.join(projectRoot, "src", "arena");
    const outputDirectory = path.join(
        projectRoot,
        "tmp",
        "arena-engine-commonjs",
    );

    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
        path.join(outputDirectory, "package.json"),
        '{"type":"commonjs"}\n',
        "utf8",
    );

    const sourcePaths = fs
        .readdirSync(sourceDirectory, {
            recursive: true,
            withFileTypes: true,
        })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
        .map((entry) => path.join(entry.parentPath, entry.name));

    for (const sourcePath of sourcePaths) {
        const relativeSourcePath = path.relative(sourceDirectory, sourcePath);
        const outputPath = path.join(
            outputDirectory,
            relativeSourcePath.replace(/\.ts$/, ".js"),
        );
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const compiled = ts.transpileModule(
            fs.readFileSync(sourcePath, "utf8"),
            {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2022,
                    module: ts.ModuleKind.CommonJS,
                },
                fileName: sourcePath,
            },
        ).outputText;
        fs.writeFileSync(outputPath, compiled, "utf8");
    }

    return outputDirectory;
};

export const loadArenaModule = (
    moduleName,
    projectRoot = process.cwd(),
) => {
    const outputDirectory = compileArenaEngine(projectRoot);
    const modulePath = path.join(outputDirectory, `${moduleName}.js`);
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
};

export const loadArenaEngine = (projectRoot = process.cwd()) =>
    loadArenaModule("index", projectRoot);
