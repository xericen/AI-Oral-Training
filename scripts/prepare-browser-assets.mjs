import {build} from 'esbuild';
import {mkdir,copyFile,readdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const [source,dest] of [['node_modules/onnxruntime-web/dist','public/runtime/onnx'],['node_modules/@mediapipe/tasks-vision/wasm','public/runtime/vision']]){
 await mkdir(path.join(root,dest),{recursive:true});
 for(const name of await readdir(path.join(root,source))){if(source.includes('onnxruntime')?!['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'].includes(name):!['vision_wasm_internal.js','vision_wasm_internal.wasm'].includes(name))continue;await copyFile(path.join(root,source,name),path.join(root,dest,name))}
}
console.log('Self-hosted ONNX and MediaPipe WASM assets prepared.');

await build({entryPoints:[path.join(root,'src/browser/vision.worker.ts')],outfile:path.join(root,'public/runtime/browser-ai.worker.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,logLevel:'warning'});
