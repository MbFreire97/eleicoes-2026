# Integração com os resultados do TSE — validação da Task 03

**Validação realizada em:** 19/10/2026

**Escopo:** resultado presidencial nacional (Brasil), primeiro e segundo turnos.

**Status:** endpoints e formato oficial verificados; esta task documenta a integração e não adiciona consumo de dados reais à aplicação.

## Fontes oficiais

- [Página de divulgação e documentos técnicos das Eleições 2026](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados)
- [Informações técnicas sobre a divulgação de resultados 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)
- [Especificação EA20 — resultado unificado](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado)
- [Instruções para download dos arquivos da Divulgação de Resultados 2026](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026)
- [Configuração EA11 publicada pelo TSE](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json)

## Descoberta e construção das URLs

O EA11 é a fonte de configuração das eleições: fornece o ambiente, o ciclo, os identificadores de eleição/pleito e os templates de arquivos. A aplicação futura deve ler essa configuração e selecionar a eleição presidencial oficial; não deve fixar identificadores em código nem tentar listar diretórios. O TSE informa que não há índice de arquivos e que URLs incorretas podem gerar 404 e bloqueio temporário.

Na configuração oficial observada nesta validação, o ambiente era `oficial`, o ciclo `ele2026`, o primeiro turno federal usava eleição `6257` (pleito `3220`) e o segundo turno presidencial usava eleição `6258`. Para o EA20 nacional, o cargo de Presidente é `0001`, e o identificador da eleição no nome do arquivo tem seis dígitos:

```text
https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json
https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json
```

Esses identificadores são a fotografia do EA11 consultado em 19/10/2026. Devem ser redescobertos da configuração no uso real, pois o EA11 é a autoridade para os códigos vigentes.

O TSE especifica o formato EA20 como `br-c<CCCC>-e<ELEICA>-u.json`. A documentação também esclarece que o resultado de Presidente deve ser obtido da totalização nacional EA20 de abrangência Brasil; não há arquivo EA10 específico de Presidente.

## Respostas e esquema observados

- **1º turno:** GET ao endpoint derivado do EA11 retornou HTTP 200 e JSON. A resposta também trouxe `Access-Control-Allow-Origin: http://localhost:4200` quando a requisição enviou esse `Origin`, permitindo a origem local observada.
- **2º turno:** a URL correspondente à eleição `6258` respondeu com JSON EA20. Na consulta observada, `and=n`, `tf=n`, havia seções nacionais (`s.ts=499248`) e nenhuma seção totalizada (`s.st=0`); os votos ainda estavam zerados. A presença de candidatos/nomes no arquivo não significa início da apuração nem resultado válido.
- **CORS:** a origem `http://localhost:4200` foi aceita no teste direto do endpoint do primeiro turno. A origem de produção (GitHub Pages/domínio final) ainda precisa ser testada quando conhecida; a documentação do TSE não publica uma garantia geral de CORS para domínios de terceiros.

Campos úteis segundo o leiaute EA20:

- Raiz: `ele`, `t`, `f`, `tpabr`, `cdabr`, `dg`, `hg`, `idg`, `dt`, `ht`, `tf`, `and`, `md` e `dv`.
- Seções: `s.ts` (total) e `s.st` (totalizadas), com percentuais como `s.pst`.
- Votos: `v.vvc` (votáveis) e `v.vv` (válidos), entre outros contadores documentados.
- Candidaturas: `carg[].agr[].par[].cand[]`; cada candidato inclui campos como `n`, `nm`, `nmu`, `vap`, `pvap`, `pvapn`, `e` e `st`.

O contrato publicado inclui campos que podem faltar conforme tipo de eleição e etapa da totalização. O adaptador futuro deve validar presença e tipo, preservar campos desconhecidos sem depender deles e expor ausência como estado de espera/indisponível, nunca como zero presumido.

## Semântica dos estados

- `f=o` identifica arquivo oficial; simulado e oficial não podem ser misturados.
- `and=n`, `p` e `f` indicam, respectivamente, sem totalização, parcial e finalizada na abrangência.
- `tf=s/n` informa se houve totalização final. Isso não é sinônimo de `and=f`.
- `md=e`, `s` ou `n` indica, quando presente e antes da totalização final, eleição matematicamente definida, segundo turno ou ainda não definida. A interface deve exibir a indicação oficial do campo, nunca inferir definição a partir da diferença de votos.
- `dv=n` significa que os votos presidenciais ainda não podem ser divulgados; o TSE informa que, nesse caso, os valores de votos no arquivo são zero. Não apresentar esses zeros como votação apurada.
- `dg`/`hg`/`idg` identificam geração do arquivo; `dt`/`ht` representam a data/hora da totalização. A hora de consulta local é um dado separado.

Na interface, `and=n` ou `dv=n` precisa resultar em mensagem de espera apropriada. Percentual de urnas, votos e definição devem vir dos campos oficiais aplicáveis, sem converter nome presente em candidatura confirmada para indicação de que a votação começou.

## Limites, atualização e riscos

- O TSE declara limite de **100 requisições por IP por segundo**; excesso pode bloquear por 10 minutos. Múltiplos 404 também podem causar bloqueio e não há limiar público. Não testar combinações de URL por tentativa/erro.
- O TSE não define intervalo de polling recomendado. A CDN aceita `ETag` e `Last-Modified`, mas respostas 304 ainda contam para o limite. Planejar baixo volume, uma consulta por vez, backoff em erro e leitura da configuração antes de buscar dados.
- Arquivos são atualizados conforme a totalização. A CDN pode sincronizar arquivos em momentos diferentes; horários em arquivos de acompanhamento são indicativos, não garantia de que o EA20 correspondente já foi atualizado.
- A resposta CORS validada cobre apenas a origem local enviada no teste. Validar a origem final de produção antes de depender de chamada direta pelo navegador. Caso ela seja bloqueada, documentar alternativas compatíveis com a arquitetura autorizada antes de propor proxy/backend.
- URLs e campos devem permanecer configuráveis e protegidos por parsing/validação. Mudanças na configuração ou no leiaute oficial exigem revisar este documento antes de implementar a Task 13.

## Implementação da Task 13

O carregamento oficial foi separado em `TseElectionDataSource` e no adaptador `tse-result.adapter.ts`. O serviço busca primeiro o EA11, localiza o cargo `1` na abrangência `br` e seleciona o turno/ano definidos em `app-environment.ts`. Em seguida, monta o EA20 nacional presidencial e valida o código da eleição e a fase oficial antes de mapear a resposta.

O adaptador transforma os campos do TSE em `ElectionSnapshot`, preserva nomes e fotos quando fornecidos, interpreta números com separador decimal brasileiro, guarda o `idg` da geração oficial e mantém o JSON cru fora dos componentes. Quando `and=n` ou `dv=n`, votos e percentuais dos candidatos ficam nulos; uma votação zero antes da totalização não é exibida como resultado. Quando o EA20 do turno ainda não existe, HTTP 404 vira um estado de espera. Falhas de rede, JSON inválido, fase inesperada e campos de estado incompletos deixam a tela em estado indisponível com opção de nova consulta manual.

O modo oficial está ativo por padrão e consulta o segundo turno de 2026. Para revisar o layout com os valores sintéticos das Tasks 07–09, `app-environment.ts` pode selecionar explicitamente `demonstration`; o rótulo e a origem continuam visíveis. A mesma interface consome o contrato interno nos dois modos.

Além da consulta manual, o aplicativo consulta a cada 5 segundos enquanto a aba está visível, suspende consultas em segundo plano e atualiza ao voltar. Uma consulta ativa é compartilhada para evitar concorrência. Falhas usam backoff até 5 minutos; o 404 do EA20 também aguarda 5 minutos antes da próxima tentativa. Esse intervalo é uma decisão do aplicativo, não uma recomendação publicada pelo TSE. A consulta manual segue disponível em Ajuda. [FAQ técnico do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)

Snapshots oficiais válidos podem ser guardados localmente no navegador para alimentar o histórico, sem interpolação e sem duplicar uma mesma amostra. O histórico é limitado a 400 pontos por eleição/turno e não sincroniza entre dispositivos. Eventos de definição matemática ou finalização só são emitidos quando o EA20 fornece a indicação oficial; a aplicação não deduz vencedor de uma liderança parcial. Alertas oficiais são deduplicados e persistidos no navegador.

O teste de CORS validado anteriormente cobre somente `http://localhost:4200`. O repositório de destino é `MbFreire97/eleicoes-2026`; a verificação de CORS na origem publicada e a publicação ainda estão pendentes. O workflow de GitHub Pages deriva o caminho base da configuração do repositório.
