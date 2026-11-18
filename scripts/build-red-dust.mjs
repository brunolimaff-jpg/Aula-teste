import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();
const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });

const cssRaw = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8')
  .replace(/@import\s+"tailwindcss";\s*/g, '');

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/red-dust/standalone.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'chrome100', 'firefox100', 'safari15'],
  write: false,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

const jsBundle = result.outputFiles[0].text;
// Escape </script> occurrences if any inside bundled JS
const safeJs = jsBundle.replace(/<\/script>/gi, '<\\/script>');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>RED DUST · Usina Horizonte</title>
<style>
${cssRaw}
</style>
</head>
<body>
<div id="app"></div>
<script>
${safeJs}
</script>
</body>
</html>
`;

const outPath = path.join(outDir, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Built self-contained RED DUST HTML: ${outPath} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`);
