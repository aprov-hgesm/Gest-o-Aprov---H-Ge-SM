# INTEGRATION STATUS — Gestão Aprov Desktop

Atualizar este arquivo como quadro vivo. O Memorial registra apenas estado consolidado.

## Baseline de planejamento

- Legado: `aprov-hgesm/Gest-o-Aprov---H-Ge-SM`
- Legado main: `a853c288d7f6bdaa49987e1b7432b8eaf7e7c4d2`
- Planejamento: `planning/desktop-intranet-master`
- Repositório desktop: ainda não criado
- Branch integradora futura: `integration/desktop-v1`

| Frente | Branch futura | Estado | Base | HEAD | Dependência | Observação |
|---|---|---|---|---|---|---|
| F0 Fundação | `work/f0-foundation` | LIVRE | novo repo | — | criar repo | primeira frente técnica |
| A Dados/Migração Base | `work/a-data-migration` | BLOQUEADA | integration | — | F0 | schema/migrations centralizados |
| B Auth/Security | `work/b-auth-security` | BLOQUEADA | integration | — | F0 | produção parcialmente depende P-001 |
| C Desktop Shell | `work/c-desktop-shell` | BLOQUEADA | integration | — | F0 | sem telas de negócio completas |
| D Admin/Audit | `work/d-admin-audit` | BLOQUEADA | integration | — | F0 + A contract | audit append-only |
| E Ops/Packaging | `work/e-ops-packaging` | BLOQUEADA | integration | — | F0 | final depende P-002/P-003 |
| F Efetivo/Afastamentos | `work/f-personnel-absences` | BLOQUEADA | integration | — | A+C+D | domínio principal |
| G Cardápio | `work/g-cardapio` | BLOQUEADA | integration | — | A+C+D | inclui workflow/version/archive |
| H Documentos/PDF | `work/h-documents` | BLOQUEADA | integration | — | C; final F/G/I/J | pode iniciar com fixtures |
| I Escalas/Permutas | `work/i-roster-swaps` | BLOQUEADA | integration | — | F+D | seleção manual congelada |
| J Saque | `work/j-saque` | BLOQUEADA | integration | — | G+D | estado separado do Cardápio |
| K Drive | `work/k-drive` | BLOQUEADA | integration | — | B+E+H+P-004 | opcional |
| L Central Operacional | `work/l-central-operational` | BLOQUEADA | integration | — | F+G+I+J+C | composição final |
| M Migração Final | `work/m-final-migration` | BLOQUEADA | integration | — | A+D+F+G+I+J | Firestore read-only |

## Regras de atualização

- trabalhador pode registrar branch/HEAD e indicar que entregou HANDOFF;
- trabalhador não se marca APROVADA;
- Coordenador marca EM REVISÃO, DEVOLVIDA, APROVADA, INTEGRADA ou DISPENSADA;
- qualquer mudança de contrato deve apontar para `DECISIONS.md`;
- após integração, registrar o commit da integradora.

## Pendências de decisão

- P-001 Auth institucional.
- P-002 Host/OS/process manager de produção.
- P-003 Instalação/assinatura/distribuição.
- P-004 Drive.
