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

self.onmessage = async (event) => {
  const { id, code } = event.data;
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
