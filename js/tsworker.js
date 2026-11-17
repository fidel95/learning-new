// tsworker.js — the real TypeScript compiler, running in a Web Worker.
// (A classic worker script: loaded with  new Worker('js/tsworker.js').)
//
// It receives  { id, code }  and answers with the type errors ("diagnostics") and the plain JavaScript
// the code compiles to. The compiler is vendored in /vendor so the book never depends on another website.
importScripts('../vendor/typescript.min.js');

// Which built-in type files to load (all of ES2020, so Array, Map, Promise... are known).
const LIB_FILES = [
  'lib.decorators.d.ts', 'lib.decorators.legacy.d.ts', 'lib.es5.d.ts',
  'lib.es2015.collection.d.ts', 'lib.es2015.core.d.ts', 'lib.es2015.d.ts', 'lib.es2015.generator.d.ts', 'lib.es2015.iterable.d.ts',
  'lib.es2015.promise.d.ts', 'lib.es2015.proxy.d.ts', 'lib.es2015.reflect.d.ts', 'lib.es2015.symbol.d.ts', 'lib.es2015.symbol.wellknown.d.ts',
  'lib.es2016.array.include.d.ts', 'lib.es2016.d.ts', 'lib.es2016.intl.d.ts',
  'lib.es2017.d.ts', 'lib.es2017.date.d.ts', 'lib.es2017.intl.d.ts', 'lib.es2017.object.d.ts', 'lib.es2017.sharedmemory.d.ts', 'lib.es2017.string.d.ts', 'lib.es2017.typedarrays.d.ts',
  'lib.es2018.asyncgenerator.d.ts', 'lib.es2018.asynciterable.d.ts', 'lib.es2018.d.ts', 'lib.es2018.intl.d.ts', 'lib.es2018.promise.d.ts', 'lib.es2018.regexp.d.ts',
  'lib.es2019.array.d.ts', 'lib.es2019.d.ts', 'lib.es2019.intl.d.ts', 'lib.es2019.object.d.ts', 'lib.es2019.string.d.ts', 'lib.es2019.symbol.d.ts',
  'lib.es2020.bigint.d.ts', 'lib.es2020.d.ts', 'lib.es2020.date.d.ts', 'lib.es2020.intl.d.ts', 'lib.es2020.number.d.ts', 'lib.es2020.promise.d.ts',
  'lib.es2020.sharedmemory.d.ts', 'lib.es2020.string.d.ts', 'lib.es2020.symbol.wellknown.d.ts',
];

// We run code in a plain JavaScript worker, not a browser page, so only a few globals exist.
const GLOBALS_D_TS = `
declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };
declare function setTimeout(handler: () => void, ms?: number): number;
declare function clearTimeout(id: number): void;
`;

const libs = {};                 // file name -> text
const files = { 'main.ts': { text: '', version: 0 }, 'globals.d.ts': { text: GLOBALS_D_TS, version: 1 } };
const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);

const options = {
  target: ts.ScriptTarget.ES2020,
  strict: true,                  // the "all safety on" mode: this is what real projects use
  noImplicitReturns: true,
  noEmit: true,
  skipLibCheck: true,
  types: [],
};

const host = {
  getScriptFileNames: () => ['main.ts', 'globals.d.ts'],
  getScriptVersion: (f) => String((files[f] && files[f].version) || 0),
  getScriptSnapshot: (f) => {
    const text = files[f] ? files[f].text : libs[baseName(f)];
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  },
  getCurrentDirectory: () => '/',
  getCompilationSettings: () => options,
  getDefaultLibFileName: () => '/lib.es2020.d.ts',
  fileExists: (f) => !!files[f] || baseName(f) in libs,
  readFile: (f) => (files[f] ? files[f].text : libs[baseName(f)]),
  directoryExists: () => true,
  getDirectories: () => [],
  useCaseSensitiveFileNames: () => true,
};

let service = null;
const ready = Promise.all(LIB_FILES.map(async (name) => {
  const res = await fetch('../vendor/ts-lib/' + name);
  libs[name] = await res.text();
})).then(() => { service = ts.createLanguageService(host, ts.createDocumentRegistry()); });

function describeAll(list) {
  return list.map((d) => {
    const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : { line: 0, character: 0 };
    return { line: pos.line + 1, col: pos.character + 1, code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') };
  });
}

// ---------- Code analysis: measure design quality from the real syntax tree ----------
const VAGUE_NAMES = new Set(['tmp', 'temp', 'data', 'stuff', 'foo', 'bar', 'thing', 'val', 'res', 'ret', 'obj', 'flag', 'info', 'x', 'y', 'z', 'a', 'b', 'c', 'd', 'o', 't']);
const ALLOWED_NUMBERS = new Set([0, 1, 2, -1]);

function analyze(code) {
  const sf = ts.createSourceFile('main.ts', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const functions = [], magic = [], vague = [], statements = new Map();
  const isFn = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);
  const nameOf = (n) => {
    if (n.name && n.name.getText) return n.name.getText(sf);
    const p = n.parent;
    if (p && ts.isVariableDeclaration(p) && p.name) return p.name.getText(sf);
    return '(anonymous)';
  };

  function measure(fn) {
    let complexity = 1, maxDepth = 0;
    const walk = (node, depth) => {
      if (node !== fn && isFn(node)) return;                     // nested functions are measured on their own
      let d = depth;
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement: case ts.SyntaxKind.ForStatement: case ts.SyntaxKind.ForInStatement: case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement: case ts.SyntaxKind.DoStatement: case ts.SyntaxKind.SwitchStatement: case ts.SyntaxKind.TryStatement:
          // an "else if" is not deeper than the if it continues
          if (!(node.kind === ts.SyntaxKind.IfStatement && node.parent && ts.isIfStatement(node.parent) && node.parent.elseStatement === node)) d = depth + 1;
          maxDepth = Math.max(maxDepth, d);
      }
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement: case ts.SyntaxKind.ForStatement: case ts.SyntaxKind.ForInStatement: case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement: case ts.SyntaxKind.DoStatement: case ts.SyntaxKind.CaseClause: case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression: complexity++; break;
        case ts.SyntaxKind.BinaryExpression: {
          const k = node.operatorToken.kind;
          if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) complexity++;
        }
      }
      ts.forEachChild(node, (c) => walk(c, d));
    };
    ts.forEachChild(fn, (c) => walk(c, 0));
    return { complexity, depth: maxDepth };
  }

  const visit = (node) => {
    if (isFn(node)) {
      const start = node.getStart(sf);
      const m = measure(node);
      functions.push({ name: nameOf(node), line: lineOf(start), lines: lineOf(node.end) - lineOf(start) + 1, params: node.parameters.length, complexity: m.complexity, depth: m.depth });
      node.parameters.forEach((p) => { if (ts.isIdentifier(p.name) && VAGUE_NAMES.has(p.name.text) && !ts.isArrowFunction(node)) vague.push({ name: p.name.text, line: lineOf(p.getStart(sf)) }); });
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && VAGUE_NAMES.has(node.name.text)) vague.push({ name: node.name.text, line: lineOf(node.getStart(sf)) });
    if (ts.isNumericLiteral(node)) {
      const v = Number(node.text); const p = node.parent;
      const negated = p && ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.MinusToken;
      const namedConstant = (() => { let q = p; while (q && (ts.isPrefixUnaryExpression(q) || ts.isParenthesizedExpression(q))) q = q.parent; return q && ts.isVariableDeclaration(q) && ts.isIdentifier(q.name) && /^[A-Z][A-Z0-9_]*$/.test(q.name.text); })();
      const inObjectOfConstants = (() => { let q = p; while (q && !ts.isSourceFile(q)) { if (ts.isVariableDeclaration(q) && ts.isIdentifier(q.name) && /^[A-Z][A-Z0-9_]*$/.test(q.name.text)) return true; q = q.parent; } return false; })();
      if (!ALLOWED_NUMBERS.has(negated ? -v : v) && !namedConstant && !inObjectOfConstants) magic.push({ value: negated ? -v : v, line: lineOf(node.getStart(sf)) });
    }
    if (ts.isExpressionStatement(node) || ts.isReturnStatement(node) || ts.isVariableStatement(node)) {
      const text = node.getText(sf).replace(/\s+/g, ' ');
      if (text.length >= 16) { const arr = statements.get(text) || []; arr.push(lineOf(node.getStart(sf))); statements.set(text, arr); }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const duplicates = [...statements.entries()].filter(([, ls]) => ls.length > 1).map(([text, lines]) => ({ text, lines }));
  const syntax = sf.parseDiagnostics ? sf.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')) : [];
  return { functions, magic, vague, duplicates, syntax };
}

self.onmessage = async (event) => {
  const { id, code } = event.data;
  if (event.data.type === 'analyze') {
    try { self.postMessage({ id, ok: true, analysis: analyze(code) }); }
    catch (e) { self.postMessage({ id, ok: false, error: String((e && e.message) || e) }); }
    return;
  }
  try {
    await ready;
    files['main.ts'] = { text: code, version: files['main.ts'].version + 1 };
    const diagnostics = describeAll([...service.getSyntacticDiagnostics('main.ts'), ...service.getSemanticDiagnostics('main.ts')]);
    // Turning TypeScript into JavaScript just deletes the types (they never exist at runtime).
    const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
    self.postMessage({ id, ok: true, diagnostics, js });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
