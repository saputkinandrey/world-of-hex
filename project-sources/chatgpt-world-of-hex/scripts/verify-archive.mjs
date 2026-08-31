import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const archiveDirectory = path.resolve(scriptDirectory, "..");
const catalog = JSON.parse(
    fs.readFileSync(path.join(archiveDirectory, "catalog.json"), "utf8"),
);
const review = JSON.parse(
    fs.readFileSync(
        path.join(archiveDirectory, "review-status.json"),
        "utf8",
    ),
);

const chatIds = new Set(catalog.chats.map((chat) => chat.id));
const reviewIds = new Set(review.entries.map((entry) => entry.chatId));

assert.equal(chatIds.size, catalog.chatCount, "Catalog chat IDs must be unique.");
assert.equal(
    reviewIds.size,
    catalog.chatCount,
    "Every chat must have one review entry.",
);

let totalTurns = 0;
let totalAttachments = 0;
let totalUserStatements = 0;

for (const chat of catalog.chats) {
    const transcriptPath = path.join(archiveDirectory, chat.archiveFile);
    const statementsPath = path.join(
        archiveDirectory,
        "user-statements",
        `${chat.id}.md`,
    );

    assert.ok(fs.existsSync(transcriptPath), `${chat.id} transcript is missing.`);
    assert.ok(
        fs.existsSync(statementsPath),
        `${chat.id} user statements are missing.`,
    );
    assert.ok(reviewIds.has(chat.id), `${chat.id} review entry is missing.`);

    const transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf8"));
    assert.equal(transcript.source.chatId, chat.id);
    assert.equal(transcript.source.url, chat.url);
    assert.ok(transcript.acquisition.pageCount >= 1);

    totalTurns += transcript.turns.length;
    totalAttachments += transcript.attachments.length;
    totalUserStatements += transcript.turns.reduce(
        (count, turn) =>
            count +
            (turn.items ?? []).filter((item) => item.type === "userMessage")
                .length,
        0,
    );
}

console.log(
    JSON.stringify({
        chatCount: catalog.chatCount,
        reviewEntryCount: review.entries.length,
        totalTurns,
        totalAttachments,
        totalUserStatements,
    }),
);
