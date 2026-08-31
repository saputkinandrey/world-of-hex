import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const archiveDirectory = path.resolve(scriptDirectory, "..");
const catalogPath = path.join(archiveDirectory, "catalog.json");
const outputDirectory = path.join(archiveDirectory, "user-statements");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
fs.mkdirSync(outputDirectory, { recursive: true });

function collectUserMessages(turn) {
    return (turn.items ?? []).flatMap((item) => {
        if (item.type !== "userMessage") {
            return [];
        }

        return (item.content ?? [])
            .filter((content) => content.type === "text" && content.text)
            .map((content) => content.text.trim())
            .filter(Boolean);
    });
}

let statementCount = 0;

for (const chat of catalog.chats) {
    const archivePath = path.join(archiveDirectory, chat.archiveFile);
    const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
    const blocks = [];

    for (const turn of archive.turns) {
        const messages = collectUserMessages(turn);
        for (const message of messages) {
            statementCount += 1;
            const timestamp = Number.isFinite(turn.startedAt)
                ? new Date(turn.startedAt * 1000).toISOString()
                : "unknown";
            blocks.push(
                `## ${timestamp} · turn ${turn.id}\n\n${message}`,
            );
        }
    }

    const document = [
        `# ${archive.source.title}`,
        "",
        `- Chat ID: \`${archive.source.chatId}\``,
        `- Original: ${archive.source.url}`,
        `- Archived transcript: \`../${chat.archiveFile}\``,
        "- Scope: user-authored statements only; later statements may supersede earlier ones.",
        "",
        blocks.length > 0
            ? blocks.join("\n\n---\n\n")
            : "_No user-authored text was returned by the source interface._",
        "",
    ].join("\n");

    fs.writeFileSync(
        path.join(outputDirectory, `${chat.id}.md`),
        document,
        "utf8",
    );
}

console.log(
    `Built ${catalog.chats.length} user-statement files with ${statementCount} statements.`,
);
