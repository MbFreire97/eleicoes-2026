# Revisão de acessibilidade — Tasks 17 e 18

## Verificações executadas

- Testes automatizados para adaptador TSE, estados ausentes, armazenamento de histórico e alertas, polling, preferências e estrutura acessível básica do shell.
- Revisão estática dos pares de cores principais do tema com cálculo de contraste WCAG: texto principal sobre o fundo quente, 15,01:1; texto secundário sobre o fundo quente, 5,70:1; texto branco no cabeçalho, 12,62:1; branco sobre teal escuro, 5,93:1; branco sobre coral escuro, 6,15:1.
- O token de foco padrão tem 4,07:1 contra branco e 3,10:1 contra o cabeçalho; o foco de alto contraste tem 8,85:1 contra branco. O anel branco de contorno melhora a identificação do foco sobre superfícies escuras.
- Rótulos pequenos foram elevados para pelo menos 1rem e os rótulos dos gráficos para 16px. O indicador não depende apenas de cor: candidatos, números, barras e legendas têm rótulos.

Essas medições cobrem apenas os pares listados e não representam certificação WCAG integral. Gradientes, estados de interação e todos os componentes precisam de revisão visual própria.

## Pendências de validação manual

O ambiente não disponibilizou um navegador controlável. Permanecem pendentes a inspeção visual em 360, 390, 430 e 768px e desktop; teclado em todas as rotas; leitor de tela; ampliação de 200%; e verificação visual de carregamento, erro e conteúdo longo. Repetir essas verificações no endereço final publicado, incluindo recarga de rotas e CORS do TSE.
