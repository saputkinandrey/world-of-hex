#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const actionsDir = path.join(__dirname, '..', 'src/rps/domain/social/from-gpt/actions-by-need');

function computeRemovalRange(prop, text) {
    let start = prop.getFullStart();
    let end = prop.getEnd();

    if (text[end] === ',') {
        end++;
        if (text[end] === '\r') {
            end++;
        }
        if (text[end] === '\n') {
            end++;
        }
    } else {
        // No trailing comma: remove possible leading comma and newline
        let tempStart = start;
        while (tempStart > 0 && /\s/.test(text[tempStart - 1])) {
            tempStart--;
            if (text[tempStart - 1] === '\n') {
                break;
            }
        }
        if (tempStart > 0 && text[tempStart - 1] === ',') {
            start = tempStart - 1;
        }
        if (text[end] === '\r') {
            end++;
            if (text[end] === '\n') {
                end++;
            }
        } else if (text[end] === '\n') {
            end++;
        }
    }

    return { start, end };
}

function getIndentBefore(node, text) {
    const lineStart = text.lastIndexOf('\n', node.getStart()) + 1;
    return text.slice(lineStart, node.getStart());
}

function insertIntoObjectLiteral(text, objectLiteral, propertyName, valueText) {
    const start = objectLiteral.getStart();
    const end = objectLiteral.getEnd();
    const objectText = text.slice(start, end);
    const hasNewlines = objectText.includes('\n');

    if (!hasNewlines) {
        const trimmed = objectText.trim();
        const inner = trimmed.slice(1, -1).trim();
        const leading = objectText.slice(0, objectText.indexOf('{'));
        const trailing = objectText.slice(objectText.lastIndexOf('}') + 1);
        const prefix = leading;
        const suffix = trailing;
        let newInner;
        if (inner.length === 0) {
            newInner = `${propertyName}: ${valueText}`;
        } else {
            newInner = `${propertyName}: ${valueText}, ${inner}`;
        }
        const newObjectCore = `{ ${newInner} }`;
        return {
            start,
            end,
            text: prefix + newObjectCore + suffix,
        };
    }

    const closeBracePos = end - 1; // position of '}'
    const newlineBeforeClose = text.lastIndexOf('\n', closeBracePos);
    const insertPos = newlineBeforeClose + 1; // start of indentation before '}'
    const closingIndent = text.slice(insertPos, closeBracePos);

    let propertyIndent = closingIndent + '    ';
    if (objectLiteral.properties.length > 0) {
        const firstProp = objectLiteral.properties[0];
        const match = text.slice(objectLiteral.getStart(), firstProp.getStart()).match(/\n(\s*)$/);
        if (match) {
            propertyIndent = match[1];
        }
    }

    const insertionText = `${propertyIndent}${propertyName}: ${valueText},\n`;
    return {
        start: insertPos,
        end: insertPos,
        text: insertionText,
    };
}

function processFile(filePath) {
    const originalText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, originalText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const modifications = [];

    function addModification(mod) {
        if (!mod) return;
        modifications.push(mod);
    }

    function visit(node) {
        if (ts.isObjectLiteralExpression(node)) {
            const propertyMap = new Map();
            for (const prop of node.properties) {
                if (!prop.name) continue;
                const propName = prop.name.getText(sourceFile);
                propertyMap.set(propName, prop);
            }

            const needProp = propertyMap.get('need');
            const rewardProp = propertyMap.get('rewardSatisfaction');

            if (!needProp || !rewardProp) {
                return;
            }

            let needKey = null;
            if (ts.isPropertyAccessExpression(needProp.initializer)) {
                needKey = needProp.initializer.name.getText(sourceFile);
            } else {
                needKey = needProp.initializer.getText(sourceFile);
            }

            if (!needKey) {
                return;
            }

            const rewardValueText = rewardProp.initializer.getText(sourceFile).trim();
            const rewardSecondaryProp = propertyMap.get('rewardSecondary');

            const needRemovalRange = computeRemovalRange(needProp, originalText);
            addModification({ start: needRemovalRange.start, end: needRemovalRange.end, text: '\n' });

            if (!rewardSecondaryProp) {
                const rewardRange = computeRemovalRange(rewardProp, originalText);
                const indent = getIndentBefore(rewardProp, originalText);
                const replacement = `\n${indent}rewardSecondary: { ${needKey}: ${rewardValueText} },\n`;
                addModification({ start: rewardRange.start, end: rewardRange.end, text: replacement });
                return;
            }

            const rewardRange = computeRemovalRange(rewardProp, originalText);
            addModification({ start: rewardRange.start, end: rewardRange.end, text: '\n' });

            if (!ts.isObjectLiteralExpression(rewardSecondaryProp.initializer)) {
                return;
            }

            const secondaryObject = rewardSecondaryProp.initializer;
            const hasNeedEntry = secondaryObject.properties.some((prop) => {
                if (!prop.name) return false;
                const nameText = prop.name.getText(sourceFile).replace(/['"]/g, '');
                return nameText === needKey;
            });

            if (!hasNeedEntry) {
                addModification(insertIntoObjectLiteral(originalText, secondaryObject, needKey, rewardValueText));
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (modifications.length === 0) {
        return false;
    }

    modifications.sort((a, b) => b.start - a.start);
    let newText = originalText;
    for (const mod of modifications) {
        newText = newText.slice(0, mod.start) + mod.text + newText.slice(mod.end);
    }

    if (newText !== originalText) {
        fs.writeFileSync(filePath, newText);
        return true;
    }

    return false;
}

function main() {
    const entries = fs.readdirSync(actionsDir).filter((file) => file.endsWith('.ts'));
    let updated = 0;
    for (const file of entries) {
        const fullPath = path.join(actionsDir, file);
        if (processFile(fullPath)) {
            updated++;
            console.log(`Updated ${file}`);
        }
    }
    console.log(`Processed ${entries.length} files, updated ${updated}.`);
}

main();
