import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {i18nTestRequire} from './renderLocalized.mjs';
const require=createRequire(import.meta.url);
export function loadComponent(path,mocks={},globals={}){
  const cache=new Map();
  function load(file){
    file=new URL(file,import.meta.url);
    if(!existsSync(file))file=['.jsx','.js','.mjs'].map(ext=>new URL(file.href+ext)).find(candidate=>existsSync(candidate))||file;
    if(cache.has(file.href))return cache.get(file.href);
    const source=readFileSync(file,'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const testModule={exports:{}};cache.set(file.href,testModule.exports);
    function localRequire(id){
      if(id in mocks)return mocks[id];
      if(id.endsWith('.css'))return {};
      if(id.startsWith('@/i18n/'))return i18nTestRequire(id);
      if(id.startsWith('@/'))return load(new URL('../../src/'+id.slice(2),import.meta.url));
      if(id.startsWith('.'))return load(new URL(id,file));
      return require(id);
    }
    vm.runInNewContext(compiled,{module:testModule,exports:testModule.exports,require:localRequire,console,structuredClone,...globals});
    cache.set(file.href,testModule.exports);return testModule.exports;
  }
  return load(new URL('../../src/'+path,import.meta.url));
}
