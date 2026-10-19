# Brasil Decide 2026

Dashboard independente para acompanhar informações da eleição presidencial brasileira. O projeto não é afiliado ao Tribunal Superior Eleitoral (TSE).

> **Estado atual:** a aplicação consulta o TSE no segundo turno de 2026. A consulta se repete a cada 30 segundos enquanto a aba está visível, pausa em segundo plano e aumenta o intervalo após falhas ou arquivos ainda não publicados. O histórico e os alertas oficiais ficam guardados localmente no navegador. O modo de demonstração usa dados sintéticos e é identificado na interface.

## Requisitos

- Node.js 24.15.x ou outra versão aceita pela matriz de compatibilidade do Angular 22.
- npm 11 ou compatível.

## Desenvolvimento

```bash
npm install
npm start
```

Abra `http://localhost:4200/` no navegador. O servidor de desenvolvimento recarrega a aplicação quando os arquivos são alterados.

No PowerShell do Windows, use `npm.cmd` se a política local bloquear `npm.ps1`.

### Modo de demonstração

Para ver a interface preenchida com a amostra sintética, abra `src/app/core/config/app-environment.ts` e altere `dataMode` de `'official'` para `'demonstration'`. A interface identifica os nomes, valores e o histórico como demonstração. Para voltar aos dados oficiais, restaure `'official'`.

## Build e testes

```bash
npm run build
npm test
```

O build de produção é salvo em `dist/`. Os testes unitários usam Vitest por meio do Angular CLI.

## Estrutura

- `src/app/core/`: modelos, configuração e contrato de dados.
- `src/app/shared/`: componentes reutilizáveis.
- `src/app/features/`: páginas e funcionalidades por área.
- `src/styles/`: tokens, mixins e estilos globais SCSS.

As rotas são `/inicio`, `/graficos`, `/alertas` e `/ajuda`. A Home apresenta candidatos, indicadores e gráficos. A página de Gráficos oferece as mesmas visualizações com explicações e números em texto.

## Fonte e histórico dos dados

A fonte oficial é o TSE. O carregamento consulta primeiro a configuração EA11 e depois o EA20 presidencial nacional do turno selecionado em `src/app/core/config/app-environment.ts`. O aplicativo não declara vencedor por liderança parcial. O histórico local só contém atualizações oficiais realmente capturadas; ele depende de o painel estar aberto e deste navegador guardar o armazenamento local. Dados de demonstração são sintéticos e nunca são apresentados como apuração oficial. Os detalhes técnicos estão em [`docs/tse-integration.md`](docs/tse-integration.md).

## Publicação no GitHub Pages

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) executa testes, compila os arquivos estáticos, prepara o caminho base e o fallback das rotas do Angular e publica o artefato com GitHub Actions. No repositório de destino, configure **Settings → Pages → Build and deployment → Source: GitHub Actions**. O caminho base é obtido da configuração do Pages; não é necessário salvar tokens ou credenciais no código.

Para simular localmente o site do repositório `MbFreire97/eleicoes-2026`:

```bash
npm run build -- --base-href /eleicoes-2026/
npm run prepare:pages -- dist/brasil-decide-2026/browser /eleicoes-2026/
```

Para GitHub Pages de usuário ou domínio próprio, use `/` como `base-href`. Antes de divulgar o endereço final, valide o carregamento do TSE/CORS no domínio publicado e teste as rotas após recarregar a página.
