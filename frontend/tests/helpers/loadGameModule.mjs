import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
// Run the actual TS game modules with real Three.js geometry, without a GPU or browser.
export function loadGameModule(name) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file.href)) return cache.get(file.href).exports;
    const loadedModule = { exports: {} };
    cache.set(file.href, loadedModule);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const localRequire = id => id.startsWith('.')
      ? load(new URL(id.endsWith('.ts') ? id : `${id}.ts`, file)) : require(id);
    // Only signboard drawing is stubbed; geometry and all simulation code stay real.
    const document = { createElement: () => ({ getContext: () => ({
      fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
    }) }) };
    vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports, require: localRequire, console, document });
    return loadedModule.exports;
  }
  return load(new URL(`../../src/components/game/sikka/${name}.ts`, import.meta.url));
}
