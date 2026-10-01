# Gestão Aprov Desktop — Índice de Planejamento

Este diretório é a fonte canônica do planejamento da migração do Gestão Aprov para uma aplicação **desktop/intranet**, sem dependência operacional de Vercel ou Firebase.

## Estado deste documento

- Repositório legado de referência: `aprov-hgesm/Gest-o-Aprov---H-Ge-SM`
- Baseline auditado: `main@a853c288d7f6bdaa49987e1b7432b8eaf7e7c4d2`
- Branch de planejamento: `planning/desktop-intranet-master`
- Repositório-alvo recomendado: `aprov-hgesm/Gestao-Aprov-Desktop` — ainda deve ser criado.
- Nesta etapa **nenhuma funcionalidade produtiva desktop foi implementada**. Apenas auditoria, arquitetura, governança e prompts foram produzidos.

## Ordem oficial de leitura

1. `docs/desktop/MEMORIAL_OFICIAL.md`
2. `docs/desktop/AUDITORIA_LEGADO.md`
3. `docs/desktop/DECISIONS.md`
4. `docs/desktop/EXECUCAO_PARALELA.md`
5. `docs/desktop/INTEGRATION_STATUS.md`
6. `docs/desktop/COORDENADOR_HANDOFF.md`
7. `docs/desktop/PROMPTS.md`

## Regra de continuidade

O repositório é a memória institucional do projeto. Nenhum chat trabalhador deve depender do que outro chat “lembra”. O trabalhador lê os documentos canônicos, executa somente seu bloco, entrega HANDOFF e para.

## Estratégia de transição

O sistema web atual permanece **congelado como referência funcional e fonte de migração de dados** até a certificação do desktop. O produto futuro opera na intranet em arquitetura cliente-servidor, com cliente desktop, API local institucional e banco PostgreSQL central. A internet será apenas auxiliar para integrações explicitamente autorizadas, como Google Drive.
