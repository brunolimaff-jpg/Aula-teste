import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, quantize, textureCompress, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const dir = '/home/claude/modelos/rbx/out/'; fs.mkdirSync(dir + 'opt', {recursive: true});
const tam = +process.argv[2] || 1024, ratio = +process.argv[3] || 0.5;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(dir + f);
  await MeshoptSimplifier.ready;
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tam, tam], quality: 80 }), resample({tolerance: 0.002}), quantize(), prune());
  await io.write(dir + 'opt/' + f, doc);
  console.log(f, (fs.statSync(dir + 'opt/' + f).size / 1024 | 0) + ' KB');
}
