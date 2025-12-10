import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

type IndicatorKind = 'text' | 'location' | 'trade';

type Indicator = {
  rule: string;
  kind: IndicatorKind;
  value: string;
};

type ActionReport = {
  file: string;
  tag: string;
  memes: string[];
  indicators: Indicator[];
  notes: string[];
};

const ROOT = path.resolve(__dirname, '..', '..', '..');
const ACTIONS_DIR = path.join(
  ROOT,
  'backend',
  'src',
  'rps',
  'domain',
  'social',
  'from-gpt',
  'actions-by-need'
);
const REPORT_FILE = path.join(ROOT, 'var', 'out', 'memes_refactor_report.csv');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const UNSET_NEED_REWORK = args.has('--unset-needrework');

const MEME_ALIAS = new Map<
  string,
  'fire' | 'heat' | 'food' | 'comm' | 'org' | 'record' | 'health' | 'culture' | 'econ' | 'cog' | 'tech'
>([
  ['health.sanitation_norms', 'health'],
  ['health.waste_handling', 'health'],
  ['health.waste_sorting', 'health'],
  ['health.first_aid_basic', 'health'],
  ['health.herbal_knowledge', 'health'],
  ['health.hygiene_tools', 'health'],
  ['tech.tool.use_basic', 'tech'],
  ['fire.control', 'fire'],
  ['heat.space.hearth', 'heat'],
  ['heat.industrial', 'heat'],
  ['food.culinary.core', 'food'],
  ['food.culinary.boil', 'food'],
  ['food.culinary.roast', 'food'],
  ['food.culinary.bake', 'food'],
  ['food.culinary.smoke', 'food'],
  ['food.preservation.fermentation', 'food'],
  ['food.preservation.drying', 'food'],
  ['food.preservation.salting', 'food'],
  ['food.preservation.pickling', 'food'],
  ['food.sanitation.kitchen_hygiene', 'food'],
  ['comm.language.written', 'comm'],
  ['org.scheduling', 'org'],
  ['org.duty_roster', 'org'],
  ['org.workshop_practice', 'org'],
  ['record.ledgerkeeping', 'record'],
  ['record.boundary_marking', 'record'],
  ['culture.vigil_ritual', 'culture'],
  ['econ.pooling_common_fund', 'econ'],
  ['econ.deposit_contract', 'econ'],
  ['cog.timekeeping.basic', 'cog'],
  ['cog.number_concept', 'cog'],
]);

const FIRE_CONTROL_WORDS = [
  'IGNITE',
  'LIGHT_FIRE',
  'KILN',
  'FORGE',
  'FURNACE',
  'SMELT',
  'SMELTING',
  'CHARCOAL_BURN',
];

const ALLOWED_ALIASES = new Set([
  'fire',
  'heat',
  'food',
  'comm',
  'org',
  'record',
  'health',
  'culture',
  'econ',
  'cog',
  'tech',
]);

function normalizeText(raw: string): string {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toUpperCase();
}

function tokenizeLocation(value: string): Set<string> {
  const tokens = new Set<string>();
  value
    .split('|')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .forEach((token) => {
      tokens.add(token);
      token.split(/[_-]/).forEach((part) => {
        if (part) tokens.add(part);
      });
    });
  return tokens;
}

function tokenizeTradeKeys(obj: ts.ObjectLiteralExpression): Set<string> {
  const tokens = new Set<string>();
  obj.properties.forEach((prop) => {
    if (ts.isPropertyAssignment(prop)) {
      const name = prop.name.getText().replace(/['"]/g, '').trim().toLowerCase();
      if (!name) return;
      tokens.add(name);
      name.split(/[_-]/).forEach((part) => {
        if (part) tokens.add(part);
      });
    }
  });
  return tokens;
}

function hasWord(text: string, word: string): boolean {
  const target = word.replace(/[_-]+/g, ' ');
  const regex = new RegExp(`\\b${target}\\b`, 'i');
  return regex.test(text);
}

function createMemeExpression(meme: string): ts.Expression {
  const parts = meme.split('.');
  let expr: ts.Expression = ts.factory.createIdentifier(parts[0]);
  for (let i = 1; i < parts.length; i++) {
    expr = ts.factory.createPropertyAccessExpression(expr, ts.factory.createIdentifier(parts[i]));
  }
  return expr;
}

function createRequiredMemesProperty(memes: string[]): ts.PropertyAssignment {
  const elements = memes.map((meme) => createMemeExpression(meme));
  const arrayLiteral = ts.factory.createArrayLiteralExpression(elements, memes.length > 1);
  return ts.factory.createPropertyAssignment('requiredMemes', arrayLiteral);
}

function isActionDefinitionObject(node: ts.ObjectLiteralExpression): boolean {
  if (!node.parent || !ts.isArrayLiteralExpression(node.parent)) return false;
  const variable = node.parent.parent;
  if (!variable || !ts.isVariableDeclaration(variable)) return false;
  const type = variable.type;
  if (!type || !ts.isArrayTypeNode(type)) return false;
  const elementType = type.elementType;
  return ts.isTypeReferenceNode(elementType) && elementType.getText() === 'ActionDefinition';
}

function getStringInitializer(node: ts.PropertyAssignment): string | null {
  const init = node.initializer;
  return ts.isStringLiteral(init) ? init.text : null;
}

function isWithinRequiredMemes(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isPropertyAssignment(current) &&
      (current.name.getText() === 'requiredMemes' || current.name.getText() === 'requiredMeme')
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function collectAliasUsage(node: ts.Node, aliases: Set<string>) {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    !isWithinRequiredMemes(node)
  ) {
    const name = node.expression.text;
    if (ALLOWED_ALIASES.has(name)) aliases.add(name);
  }
  ts.forEachChild(node, (child) => collectAliasUsage(child, aliases));
}

type ActionComputation = {
  newNode: ts.ObjectLiteralExpression;
  report: ActionReport;
  aliases: Set<string>;
};

function processAction(
  action: ts.ObjectLiteralExpression,
  filePath: string
): ActionComputation {
  const indicators: Indicator[] = [];
  const notes: string[] = [];

  const tagProp = action.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText() === 'tag'
  );
  let tagText = '';
  if (tagProp && ts.isPropertyAccessExpression(tagProp.initializer)) {
    tagText = tagProp.initializer.getText();
  }

  const textPieces: string[] = [tagText];
  action.properties.forEach((prop) => {
    if (ts.isPropertyAssignment(prop)) {
      const name = prop.name.getText();
      if (name === 'requiredMemes' || name === 'requiredMeme') return;
    }
    textPieces.push(prop.getText());
  });
  const textNormalized = normalizeText(textPieces.join(' '));

  const requiresLocationProp = action.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText() === 'requiresLocation'
  );
  const locTokens = requiresLocationProp
    ? tokenizeLocation(getStringInitializer(requiresLocationProp) ?? '')
    : new Set<string>();

  const tradeEffectProp = action.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText() === 'tradeEffect'
  );
  const tradeTokens = tradeEffectProp && ts.isObjectLiteralExpression(tradeEffectProp.initializer)
    ? tokenizeTradeKeys(tradeEffectProp.initializer)
    : new Set<string>();

  const hasText = (word: string) => hasWord(textNormalized, word);
  const hasLocation = (word: string) => locTokens.has(word.toLowerCase());
  const hasTrade = (word: string) => tradeTokens.has(word.toLowerCase());

  const memes: string[] = [];
  const memeSet = new Set<string>();
  const aliasSet = new Set<string>();
  let signageTriggered = false;

  const addMeme = (meme: string) => {
    if (!memeSet.has(meme)) {
      memeSet.add(meme);
      memes.push(meme);
      const alias = MEME_ALIAS.get(meme);
      if (alias) aliasSet.add(alias);
    }
  };

  // Rule helpers
  const pushMatches = (
    matched: string[],
    rule: string,
    kind: IndicatorKind
  ) => matched.forEach((value) => indicators.push({ rule, kind, value }));

  // Rule 1
  const sanitationTextMatches = ['CLEAN', 'CLEANING', 'SANITATION', 'WASTE'].filter(hasText);
  const sanitationLocMatches = ['square', 'yard', 'streets', 'commons'].filter(hasLocation);
  if (sanitationTextMatches.length || sanitationLocMatches.length) {
    pushMatches(sanitationTextMatches, 'R1', 'text');
    pushMatches(sanitationLocMatches, 'R1', 'location');
    addMeme('health.sanitation_norms');
    addMeme('health.waste_handling');

    const toolMatches = ['broom', 'brush', 'bucket', 'cloth', 'tools', 'soap', 'lime'].filter(
      hasTrade
    );
    pushMatches(toolMatches, 'R1', 'trade');
    if (toolMatches.length) addMeme('tech.tool.use_basic');

    const schedulingMatches = ['WEEKLY', 'CADENCE', 'ROTATION', 'SCHEDULE'].filter(hasText);
    pushMatches(schedulingMatches, 'R1', 'text');
    if (schedulingMatches.length) addMeme('org.scheduling');

    const signageMatches = ['NOTICE', 'BOARD', 'SIGN', 'POSTED', 'BOUNDARY', 'MARK', 'MARKING'].filter(
      hasText
    );
    pushMatches(signageMatches, 'R1', 'text');
    if (signageMatches.length) signageTriggered = true;
  }

  // Rule 2
  const vigilTextMatches = ['VIGIL', 'WATCH', 'DANGEROUS_SITE', 'NIGHT'].filter(hasText);
  const vigilLocMatches = ['hearth', 'fire_pit', 'memorial', 'temple', 'gate'].filter(hasLocation);
  if (vigilTextMatches.length || vigilLocMatches.length) {
    pushMatches(vigilTextMatches, 'R2', 'text');
    pushMatches(vigilLocMatches, 'R2', 'location');
    addMeme('culture.vigil_ritual');
    addMeme('cog.timekeeping.basic');

    const boundaryMatches = ['BOUNDARY', 'MARK', 'MARKING'].filter(hasText);
    const signageMatches = ['SIGN', 'POSTING'].filter(hasText);
    pushMatches(boundaryMatches, 'R2', 'text');
    pushMatches(signageMatches, 'R2', 'text');
    if (boundaryMatches.length) addMeme('record.boundary_marking');
    if (signageMatches.length) signageTriggered = true;

    const aidMatches = ['BANDAGE', 'BANDAGES', 'HERB', 'HERBS'].filter(hasTrade);
    pushMatches(aidMatches, 'R2', 'trade');
    if (aidMatches.length) addMeme('health.first_aid_basic');

    if (hasLocation('hearth') || hasLocation('fire_pit') || hasLocation('fire')) {
      addMeme('heat.space.hearth');
    }

    const fireCtrlMatches = FIRE_CONTROL_WORDS.filter(hasText);
    pushMatches(fireCtrlMatches, 'R2', 'text');
    if (fireCtrlMatches.length) addMeme('fire.control');
  }

  // Rule 3
  const chartTextMatches = [
    'CHART',
    'ROLE_CHART',
    'DUTY_CHART',
    'POSTING',
    'BOARD',
    'KPI',
    'TALLY',
  ].filter(hasText);
  const chartLocMatches = ['hall', 'notice_board', 'board', 'square'].filter(hasLocation);
  const chartTradeMatches = ['parchment', 'ink', 'board_or_tablet', 'chalk'].filter(hasTrade);
  if (chartTextMatches.length || chartLocMatches.length || chartTradeMatches.length) {
    pushMatches(chartTextMatches, 'R3', 'text');
    pushMatches(chartLocMatches, 'R3', 'location');
    pushMatches(chartTradeMatches, 'R3', 'trade');
    signageTriggered = true;

    const dutyMatches = ['DUTY', 'ROSTER', 'ROLE_CHART', 'ESCALATION'].filter(hasText);
    pushMatches(dutyMatches, 'R3', 'text');
    if (dutyMatches.length) addMeme('org.duty_roster');

    const ledgerMatches = ['REPORT', 'LEDGER', 'MARKS', 'KPI', 'TALLY', 'TOKENS'].filter(hasText);
    pushMatches(ledgerMatches, 'R3', 'text');
    if (ledgerMatches.length) addMeme('record.ledgerkeeping');

    const numberMatches = ['KPI', 'TALLY', 'COUNT', 'MARK', 'MARKS'].filter(hasText);
    pushMatches(numberMatches, 'R3', 'text');
    if (numberMatches.length) addMeme('cog.number_concept');
  }

  // Rule 4
  const poolingTextMatches = [
    'MUTUAL_AID',
    'COMMON_FUND',
    'COLLECT_FUND',
    'POOL',
    'PLEDGE',
  ].filter(hasText);
  const poolingStrongTradeMatches = [
    'tokens',
    'pouch',
    'wax',
    'ribbon',
    'seal',
    'ledger',
  ].filter(hasTrade);
  const poolingWeakTradeMatches = ['parchment', 'ink'].filter(hasTrade);
  const poolingTriggered =
    poolingTextMatches.length > 0 ||
    poolingStrongTradeMatches.length > 0 ||
    (poolingWeakTradeMatches.length > 0 && poolingTextMatches.length > 0);
  if (poolingTriggered) {
    pushMatches(poolingTextMatches, 'R4', 'text');
    pushMatches(poolingStrongTradeMatches, 'R4', 'trade');
    if (poolingWeakTradeMatches.length) {
      pushMatches(poolingWeakTradeMatches, 'R4', 'trade');
    }
    addMeme('record.ledgerkeeping');
    addMeme('econ.pooling_common_fund');

    const depositMatches = ['DEPOSIT', 'MICROGRANT', 'PLEDGE'].filter(hasText);
    pushMatches(depositMatches, 'R4', 'text');
    if (depositMatches.length) addMeme('econ.deposit_contract');

    const signageMatches = ['NOTICE', 'POSTED', 'BOARD'].filter(hasText);
    pushMatches(signageMatches, 'R4', 'text');
    if (signageMatches.length) signageTriggered = true;

    const schedulingMatches = ['WEEKLY', 'CADENCE', 'ROTATION', 'SCHEDULE'].filter(hasText);
    pushMatches(schedulingMatches, 'R4', 'text');
    if (schedulingMatches.length) addMeme('org.scheduling');
  }

  // Rule 5
  const industrialLocMatches = ['kiln', 'forge', 'furnace', 'smithy', 'smelter'].filter(hasLocation);
  pushMatches(industrialLocMatches, 'R5', 'location');
  if (industrialLocMatches.length) addMeme('heat.industrial');

  if (hasLocation('hearth') || hasLocation('fire_pit')) {
    indicators.push({ rule: 'R5', kind: 'location', value: hasLocation('hearth') ? 'hearth' : 'fire_pit' });
    addMeme('heat.space.hearth');
  }

  const fireControlMatches = FIRE_CONTROL_WORDS.filter(hasText);
  pushMatches(fireControlMatches, 'R5', 'text');
  if (fireControlMatches.length) addMeme('fire.control');

  // Rule 6
  const artTextMatches = ['CRAFT_DECORATIVE_ART', 'REGISTER_ART_MARK', 'MARK', 'INSCRIBE'].filter(hasText);
  const artLocMatches = ['workshop', 'guild_hall'].filter(hasLocation);
  const artTradeMatches = ['pigments', 'chalk', 'board_or_tablet', 'parchment', 'ink', 'tools'].filter(
    hasTrade
  );
  if (artTextMatches.length || artLocMatches.length || artTradeMatches.length) {
    pushMatches(artTextMatches, 'R6', 'text');
    pushMatches(artLocMatches, 'R6', 'location');
    pushMatches(artTradeMatches, 'R6', 'trade');
    signageTriggered = true;

    const registerMatches = ['REGISTER', 'LEDGER', 'RECORD'].filter(hasText);
    pushMatches(registerMatches, 'R6', 'text');
    if (registerMatches.length) addMeme('record.ledgerkeeping');

    if (artLocMatches.length) addMeme('org.workshop_practice');

    const toolMatches = ['TOOLS', 'BRUSH', 'CHISEL', 'KNIFE'].filter(
      (word) => hasText(word) || hasTrade(word)
    );
    toolMatches.forEach((word) =>
      indicators.push({ rule: 'R6', kind: hasTrade(word) ? 'trade' : 'text', value: word })
    );
    if (toolMatches.length) addMeme('tech.tool.use_basic');
  }

  // Rule 7
  const thermalCandidates: Array<[string, string]> = [
    ['BOIL', 'food.culinary.boil'],
    ['ROAST', 'food.culinary.roast'],
    ['BAKE', 'food.culinary.bake'],
    ['SMOKE', 'food.culinary.smoke'],
  ];
  const thermalMatches = thermalCandidates.filter(([word]) => hasText(word));
  if (thermalMatches.length) {
    pushMatches(thermalMatches.map(([word]) => word), 'R7', 'text');
    addMeme('food.culinary.core');
    thermalMatches.forEach(([, meme]) => addMeme(meme));
  }

  const preservationCandidates: Array<[string, string]> = [
    ['FERMENT', 'food.preservation.fermentation'],
    ['DRY', 'food.preservation.drying'],
    ['SALT', 'food.preservation.salting'],
    ['PICKLE', 'food.preservation.pickling'],
  ];
  const preservationMatches = preservationCandidates.filter(([word]) => hasText(word));
  preservationMatches.forEach(([word, meme]) => {
    indicators.push({ rule: 'R7', kind: 'text', value: word });
    addMeme(meme);
  });

  const kitchenIndicators: string[] = [];
  const hasKitchenWord = hasText('KITCHEN');
  const hasHygieneWord = hasText('HYGIENE');
  if (hasText('KITCHEN_HYGIENE')) kitchenIndicators.push('KITCHEN_HYGIENE');
  if (hasKitchenWord) kitchenIndicators.push('KITCHEN');
  if (hasHygieneWord) kitchenIndicators.push('HYGIENE');
  if ((hasKitchenWord && hasHygieneWord) || hasText('KITCHEN_HYGIENE')) {
    const uniqueIndicators = [...new Set(kitchenIndicators)];
    pushMatches(uniqueIndicators, 'R7', 'text');
    addMeme('food.sanitation.kitchen_hygiene');
  }

  if (signageTriggered) {
    const signageCovered = memeSet.has('record.boundary_marking') || memeSet.has('law.public_posting');
    if (!signageCovered) addMeme('comm.language.written');
  }

  const existingRequired = action.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText() === 'requiredMemes'
  );

  const existingMemes: string[] = [];
  if (
    existingRequired &&
    ts.isArrayLiteralExpression(existingRequired.initializer)
  ) {
    existingRequired.initializer.elements.forEach((el) => {
      existingMemes.push(el.getText().trim());
    });
  }

  const legacyRequired = action.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText() === 'requiredMeme'
  );
  if (legacyRequired) notes.push('removed_requiredMeme_legacy');

  if (!memes.length) notes.push('no_required_memes');

  const newProperties: ts.ObjectLiteralElementLike[] = [];
  let replacedRequired = false;

  action.properties.forEach((prop) => {
    if (!ts.isPropertyAssignment(prop)) {
      newProperties.push(prop);
      return;
    }
    const name = prop.name.getText();
    if (name === 'requiredMemes') {
      replacedRequired = true;
      if (memes.length) newProperties.push(createRequiredMemesProperty(memes));
      return;
    }
    if (name === 'requiredMeme') {
      return;
    }
    if (
      name === 'needRework' &&
      UNSET_NEED_REWORK &&
      prop.initializer.getText() === 'true'
    ) {
      notes.push('removed_needRework');
      return;
    }
    newProperties.push(prop);
  });

  if (memes.length && !replacedRequired) {
    newProperties.push(createRequiredMemesProperty(memes));
  }

  const newNode = ts.factory.updateObjectLiteralExpression(action, newProperties);

  const report: ActionReport = {
    file: path.relative(ROOT, filePath),
    tag: tagText,
    memes,
    indicators,
    notes,
  };

  return { newNode, report, aliases: aliasSet };
}

function updateImportDeclaration(
  declaration: ts.ImportDeclaration,
  aliases: string[]
): ts.ImportDeclaration | undefined {
  if (!aliases.length) return undefined;
  const namedImports = ts.factory.createNamedImports(
    aliases.sort((a, b) => a.localeCompare(b)).map((alias) =>
      ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(alias))
    )
  );
  return ts.factory.updateImportDeclaration(
    declaration,
    declaration.modifiers,
    ts.factory.createImportClause(false, undefined, namedImports),
    declaration.moduleSpecifier,
    declaration.assertClause
  );
}

function ensureDir(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

const reports: ActionReport[] = [];

for (const fileName of fs.readdirSync(ACTIONS_DIR)) {
  if (!fileName.endsWith('.ts')) continue;
  const filePath = path.join(ACTIONS_DIR, fileName);
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  const aliasUsage = new Set<string>();
  collectAliasUsage(sourceFile, aliasUsage);

  const actionMap = new Map<ts.ObjectLiteralExpression, ActionComputation>();

  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node) && isActionDefinitionObject(node)) {
      const computation = processAction(node, filePath);
      actionMap.set(node, computation);
      computation.aliases.forEach((alias) => aliasUsage.add(alias));
      reports.push(computation.report);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (!APPLY || actionMap.size === 0) continue;

  const aliasesArray = [...aliasUsage];

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visitor: ts.Visitor = (node) => {
      if (ts.isObjectLiteralExpression(node) && actionMap.has(node)) {
        return actionMap.get(node)!.newNode;
      }
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === '../memes'
      ) {
        const updated = updateImportDeclaration(node, aliasesArray);
        if (!updated) return undefined;
        return updated;
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return (node) => (ts.visitNode(node, visitor) as ts.SourceFile) ?? node;
  };

  const result = ts.transform(sourceFile, [transformer]);
  let transformed = result.transformed[0] as ts.SourceFile;
  result.dispose();

  let statements = [...transformed.statements];

  if (!aliasesArray.length) {
    statements = statements.filter(
      (stmt) =>
        !(
          ts.isImportDeclaration(stmt) &&
          ts.isStringLiteral(stmt.moduleSpecifier) &&
          stmt.moduleSpecifier.text === '../memes'
        )
    );
  }

  if (aliasesArray.length) {
    const hasMemesImport = statements.some(
      (stmt) =>
        ts.isImportDeclaration(stmt) &&
        ts.isStringLiteral(stmt.moduleSpecifier) &&
        stmt.moduleSpecifier.text === '../memes'
    );
    if (!hasMemesImport) {
      const sortedAliases = [...aliasesArray].sort((a, b) => a.localeCompare(b));
      const newImport = ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(
            sortedAliases.map((alias) =>
              ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(alias))
            )
          )
        ),
        ts.factory.createStringLiteral('../memes', true)
      );
      const insertIndex = statements.findIndex((stmt) => !ts.isImportDeclaration(stmt));
      if (insertIndex === -1) {
        statements.push(newImport);
      } else {
        statements.splice(insertIndex, 0, newImport);
      }
    }
  }

  transformed = ts.factory.updateSourceFile(transformed, statements);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printed = printer.printFile(transformed);
  const normalized = printed.replace(/from "\.\.\/memes"/g, "from '../memes'");
  fs.writeFileSync(filePath, normalized, 'utf8');
}

ensureDir(REPORT_FILE);
const rows = [
  ['file', 'tag', 'new_requiredMemes', 'indicators_matched', 'notes'],
  ...reports.map((report) => [
    report.file,
    report.tag,
    report.memes.join('|'),
    report.indicators.map((i) => `${i.rule}:${i.kind}:${i.value}`).join('|'),
    report.notes.join('|'),
  ]),
];

const csv = rows
  .map((cols) =>
    cols
      .map((col) => `"${col.replace(/"/g, '""')}"`)
      .join(',')
  )
  .join('\n');

fs.writeFileSync(REPORT_FILE, `${csv}\n`, 'utf8');

console.log(
  APPLY
    ? 'Required memes refactoring applied. Report written to var/out/memes_refactor_report.csv'
    : 'Dry run complete. Report written to var/out/memes_refactor_report.csv'
);
