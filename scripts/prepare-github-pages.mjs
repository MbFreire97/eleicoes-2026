import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const [outputArgument = 'dist/brasil-decide-2026', baseHrefArgument = '/'] = process.argv.slice(2);
const outputDirectory = resolve(outputArgument);
const normalizedBaseHref = baseHrefArgument.startsWith('/')
  ? baseHrefArgument
  : `/${baseHrefArgument}`;
const baseHref = normalizedBaseHref.endsWith('/') ? normalizedBaseHref : `${normalizedBaseHref}/`;

if (baseHref.includes('..') || baseHref.includes('?') || baseHref.includes('#')) {
  throw new Error('O base-href deve ser um caminho absoluto simples, sem query ou fragmento.');
}

const indexPath = resolve(outputDirectory, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
const placeholder = '<script id="github-pages-route-restore-placeholder"></script>';

if (!indexHtml.includes(placeholder)) {
  throw new Error('Marcador de restauração de rota do GitHub Pages não encontrado em index.html.');
}

const restoreScript = `<script id="github-pages-route-restore">
(() => {
  const route = new URLSearchParams(window.location.search).get('gh-pages-route');
  if (route === null) return;
  const base = new URL(${JSON.stringify(baseHref)}, window.location.origin);
  const target = new URL(route.replace(/^\\/+/, ''), base);
  if (target.origin === window.location.origin && target.pathname.startsWith(base.pathname)) {
    window.history.replaceState(null, '', target.pathname + target.search + target.hash);
  }
})();
</script>`;

indexHtml = indexHtml.replace(placeholder, restoreScript);
await writeFile(indexPath, indexHtml, 'utf8');

const notFoundHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex">
    <title>Redirecionando | Brasil Decide 2026</title>
    <script>
      (() => {
        const base = new URL(${JSON.stringify(baseHref)}, window.location.origin);
        const route = window.location.pathname.startsWith(base.pathname)
          ? window.location.pathname.slice(base.pathname.length)
          : '';
        const destination = new URL(base.href);
        destination.searchParams.set('gh-pages-route', route + window.location.search + window.location.hash);
        window.location.replace(destination.href);
      })();
    </script>
  </head>
  <body><p>Carregando a página solicitada…</p></body>
</html>
`;

await Promise.all([
  writeFile(resolve(outputDirectory, '404.html'), notFoundHtml, 'utf8'),
  writeFile(resolve(outputDirectory, '.nojekyll'), '', 'utf8'),
]);

process.stdout.write(`Fallback de rotas e base-href ${baseHref} preparados em ${outputDirectory}.\n`);
