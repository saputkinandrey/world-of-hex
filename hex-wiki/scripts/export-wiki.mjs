#!/usr/bin/env node
/**
 * Export the entire Hex wiki into one readable Markdown file (+ assets).
 *
 * Usage:
 *   node hex-wiki/scripts/export-wiki.mjs
 *   npm run wiki:export
 *
 * Output:
 *   hex-wiki/export/hex-wiki-YYYY-MM-DD.md
 *   hex-wiki/export/assets/...
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEX_WIKI_ROOT = path.resolve(__dirname, "..");
const WIKI_ROOT = path.join(HEX_WIKI_ROOT, "wiki");
const EXPORT_ROOT = path.join(HEX_WIKI_ROOT, "export");

/** Preferred reading order for top-level sections. */
const SECTION_ORDER = [
  "Home.md",
  "canon",
  "rules",
  "meta",
  "sources",
  "Sidebar.md",
];

/**
 * @param {string} filePath
 * @returns {string}
 */
function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} relPosix
 * @returns {number}
 */
function sectionRank(relPosix) {
  if (relPosix === "Home.md") {
    return 0;
  }
  if (relPosix === "Sidebar.md") {
    return 900;
  }
  const top = relPosix.split("/")[0];
  const idx = SECTION_ORDER.indexOf(top);
  return idx === -1 ? 500 : idx;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function comparePages(a, b) {
  const ra = sectionRank(a);
  const rb = sectionRank(b);
  if (ra !== rb) {
    return ra - rb;
  }
  const aDepth = a.split("/").length;
  const bDepth = b.split("/").length;
  const aIsIndex =
    a.endsWith("/Index.md") || a === "Index.md" || a === "Home.md";
  const bIsIndex =
    b.endsWith("/Index.md") || b === "Index.md" || b === "Home.md";
  if (aIsIndex && bIsIndex && aDepth !== bDepth) {
    return aDepth - bDepth;
  }
  if (aIsIndex !== bIsIndex) {
    return aIsIndex ? -1 : 1;
  }
  return a.localeCompare(b, "en");
}

/**
 * @param {string} relPosix e.g. canon/factions/amritar.md
 * @returns {string}
 */
function pageIdFromRel(relPosix) {
  const noExt = relPosix.replace(/\.md$/i, "");
  return noExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {string} wikiPath e.g. /canon/factions/amritar or Home
 * @returns {string}
 */
function pageIdFromWikiPath(wikiPath) {
  let cleaned = wikiPath.trim();
  if (cleaned.startsWith("/")) {
    cleaned = cleaned.slice(1);
  }
  if (!cleaned || cleaned.toLowerCase() === "home") {
    return pageIdFromRel("Home.md");
  }
  if (!cleaned.toLowerCase().endsWith(".md")) {
    cleaned = `${cleaned}.md`;
  }
  return pageIdFromRel(cleaned);
}

/**
 * @param {string} markdown
 * @returns {{ frontMatter: Record<string, string>, body: string }}
 */
function splitFrontMatter(markdown) {
  if (!markdown.startsWith("---\n") && !markdown.startsWith("---\r\n")) {
    return { frontMatter: {}, body: markdown };
  }
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { frontMatter: {}, body: markdown };
  }
  const raw = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).replace(/^\r?\n/, "");
  /** @type {Record<string, string>} */
  const frontMatter = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) {
      continue;
    }
    frontMatter[m[1]] = m[2].replace(/^"|"$/g, "").trim();
  }
  return { frontMatter, body };
}

/**
 * Demote ATX headings by one level so page H1 becomes H2 under the export H1.
 * @param {string} body
 * @returns {string}
 */
function demoteHeadings(body) {
  return body.replace(/^(#{1,5})\s+/gm, (_, hashes) => `${hashes}# `);
}

/**
 * @param {string} body
 * @param {Set<string>} usedAssets
 * @returns {string}
 */
function rewriteContent(body, usedAssets) {
  let text = body;

  // Images: ![alt](/assets/...) -> ![alt](./assets/...)
  text = text.replace(
    /!\[([^\]]*)\]\((\/assets\/[^)\s]+)\)/g,
    (_m, alt, assetPath) => {
      const rel = assetPath.replace(/^\//, "");
      usedAssets.add(rel);
      return `![${alt}](./${rel})`;
    },
  );

  // Gollum links: [[Label|/path/to/page]]
  text = text.replace(
    /\[\[([^\]|]+)\|(\/[^\]|]+)\]\]/g,
    (_m, label, wikiPath) => {
      const id = pageIdFromWikiPath(wikiPath);
      return `[${label.trim()}](#${id})`;
    },
  );

  // Gollum links without path: [[Home]] / [[Label]]
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_m, label) => {
    const trimmed = label.trim();
    if (trimmed.toLowerCase() === "home") {
      return `[${trimmed}](#${pageIdFromRel("Home.md")})`;
    }
    return trimmed;
  });

  return text;
}

/**
 * @param {string} srcRoot
 * @param {string} dstRoot
 * @param {Set<string>} usedAssets relative posix paths like assets/images/x.png
 */
function copyUsedAssets(srcRoot, dstRoot, usedAssets) {
  for (const rel of usedAssets) {
    const src = path.join(srcRoot, ...rel.split("/"));
    const dst = path.join(dstRoot, ...rel.split("/"));
    if (!fs.existsSync(src)) {
      console.warn(`Missing asset: ${rel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

/**
 * @returns {void}
 */
function main() {
  if (!fs.existsSync(WIKI_ROOT)) {
    console.error(`Wiki root not found: ${WIKI_ROOT}`);
    process.exit(1);
  }

  const allFiles = listMarkdownFiles(WIKI_ROOT)
    .map((full) => ({
      full,
      rel: toPosix(path.relative(WIKI_ROOT, full)),
    }))
    .sort((a, b) => comparePages(a.rel, b.rel));

  const stamp = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ
  const exportDir = EXPORT_ROOT;
  fs.mkdirSync(exportDir, { recursive: true });
  const outMd = path.join(exportDir, `hex-wiki-${stamp}.md`);
  const usedAssets = new Set();

  /** @type {string[]} */
  const parts = [];
  parts.push(`# World of Hex Wiki`);
  parts.push("");
  parts.push(
    `Экспорт всей wiki одним файлом. Дата: **${stamp}**. Страниц: **${allFiles.length}**.`,
  );
  parts.push("");
  parts.push(
    "Картинки лежат рядом в папке `assets/`. Откройте этот `.md` в любом Markdown-ридере (Obsidian, VS Code, Typora) из той же папки `export/`.",
  );
  parts.push("");
  parts.push("## Оглавление");
  parts.push("");

  /** @type {{ id: string, title: string, rel: string }[]} */
  const toc = [];

  for (const file of allFiles) {
    const raw = fs.readFileSync(file.full, "utf8");
    const { frontMatter, body } = splitFrontMatter(raw);
    const id = pageIdFromRel(file.rel);
    const title =
      frontMatter.title ||
      body.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
      path.basename(file.rel, ".md");
    toc.push({ id, title, rel: file.rel });
  }

  let currentSection = "";
  for (const item of toc) {
    const section = item.rel.includes("/")
      ? item.rel.split("/")[0]
      : "(корень)";
    if (section !== currentSection) {
      if (currentSection !== "") {
        parts.push("");
      }
      currentSection = section;
      parts.push(`### ${section}`);
      parts.push("");
    }
    parts.push(`- [${item.title}](#${item.id}) \`${item.rel}\``);
  }

  parts.push("");
  parts.push("---");
  parts.push("");

  for (const file of allFiles) {
    const raw = fs.readFileSync(file.full, "utf8");
    const { frontMatter, body } = splitFrontMatter(raw);
    const id = pageIdFromRel(file.rel);
    const title =
      frontMatter.title ||
      body.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
      path.basename(file.rel, ".md");

    parts.push(`## ${title}`);
    parts.push("");
    parts.push(`<a id="${id}"></a>`);
    parts.push("");
    parts.push(`*Источник: \`${file.rel}\`*`);
    if (frontMatter.status || frontMatter.authority) {
      const bits = [];
      if (frontMatter.status) {
        bits.push(`status: ${frontMatter.status}`);
      }
      if (frontMatter.authority) {
        bits.push(`authority: ${frontMatter.authority}`);
      }
      if (frontMatter.updated) {
        bits.push(`updated: ${frontMatter.updated}`);
      }
      parts.push("");
      parts.push(`*${bits.join(" · ")}*`);
    }
    parts.push("");

    let content = demoteHeadings(body.trim());
    content = content.replace(
      new RegExp(
        `^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
        "i",
      ),
      "",
    );
    content = rewriteContent(content, usedAssets);
    parts.push(content.trim());
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  fs.writeFileSync(outMd, `${parts.join("\n").replace(/\n+$/, "\n")}`, "utf8");
  copyUsedAssets(WIKI_ROOT, exportDir, usedAssets);

  const bytes = fs.statSync(outMd).size;
  console.log(`Exported ${allFiles.length} pages`);
  console.log(`Markdown: ${outMd} (${bytes} bytes)`);
  console.log(
    `Assets:   ${usedAssets.size} files under ${path.join(exportDir, "assets")}`,
  );
  console.log("");
  console.log(
    "Share the whole hex-wiki/export/ folder (md + assets), or just the .md if images are not needed.",
  );
}

main();
