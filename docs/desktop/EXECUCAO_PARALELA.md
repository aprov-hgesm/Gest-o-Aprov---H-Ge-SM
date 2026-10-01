# EXECUÇÃO PARALELA — Gestão Aprov Desktop/Intranet

## 1. Princípio

A execução oficial é:

> Fundação comum → blocos independentes em paralelo → blocos dependentes → integração semântica → certificação → main.

A independência é avaliada por **código e contratos**, não só por funcionalidade.

## 2. Estados oficiais

- LIVRE
- EM ANDAMENTO
- EM REVISÃO
- DEVOLVIDA
- BLOQUEADA
- APROVADA
- INTEGRADA
- DISPENSADA

Somente o Chat Coordenador altera uma frente para APROVADA, INTEGRADA ou DISPENSADA.

---

# 3. Blocos

## F0 — Fundação Desktop/Intranet

**Objetivo:** criar a base técnica comum que permitirá trabalho paralelo seguro.

**Escopo:**
- novo repositório;
- monorepo/pastas;
- Tauri 2 + React/TypeScript mínimo;
- FastAPI mínimo;
- PostgreSQL de desenvolvimento;
- SQLAlchemy/Alembic;
- padrão OpenAPI;
- client API gerado/validado;
- estrutura de testes;
- CI;
- error envelope;
- correlation/request id;
- versão otimista;
- configuração local do endpoint da API;
- convenções de módulos.

**Owns:**
- raiz do novo repositório;
- `.github/**`;
- `apps/desktop/src-tauri/**` inicial;
- `apps/desktop/src/core/**` inicial;
- `services/api/app/core/**`;
- `services/api/app/main.py`;
- `packages/contracts/**`;
- `infra/dev/**`.

**Não implementar:** módulos de negócio completos.

**Dependências:** nenhuma além da criação do novo repositório.

**Critério de conclusão:** desktop abre, consulta `/api/v1/health`, API conecta no PostgreSQL de desenvolvimento, migration inicial executa, OpenAPI é gerado e CI fica verde.

---

## A — Plataforma de Dados + Base de Migração

**Objetivo:** transformar o banco e migração em infraestrutura central, sem lógica de UI.

**Escopo:**
- schema PostgreSQL base;
- SQLAlchemy models/repositories;
- migrations Alembic;
- constraints/índices;
- `row_version`;
- transações;
- provenance de migração;
- ferramenta read-only de extração/importação;
- dry-run;
- relatórios de contagem, IDs, checksum e rejeições.

**Owns:**
- `services/api/app/db/**`;
- `services/api/app/repositories/**`;
- `alembic/**`;
- `tools/migration/**`;
- testes de banco/migração.

**Não owns:** regras de negócio de Efetivo/Cardápio/Escala/Saque; UI; auth.

**Dependência:** F0.

**Risco principal:** tentar definir schema diferente do Memorial. Mudança de contrato exige Coordenador.

**Testes:** migrations do zero e upgrade, rollback quando aplicável, constraints, concorrência, idempotência, dry-run.

---

## B — Autenticação, Usuários e Segurança

**Objetivo:** criar uma camada de acesso institucional substituindo Firebase Auth.

**Escopo que pode iniciar sem P-001:**
- abstração `AuthProvider`;
- modelos de usuário/role/permission;
- middleware/dependencies FastAPI;
- autorização server-side;
- sessão/token para desenvolvimento/teste;
- proteção de endpoints;
- logout/expiração;
- auditoria técnica do usuário autenticado.

**Escopo bloqueado por P-001:** adaptador definitivo AD/LDAP/SSO ou política final de contas locais.

**Owns:**
- `services/api/app/security/**`;
- `services/api/app/modules/users/**`;
- `apps/desktop/src/features/auth/**`.

**Não owns:** aprovação do Cardápio com identidade real. Isso continua fora de escopo.

**Dependência:** F0; schema de users coordenado com A.

**Testes:** deny-by-default, expiração, role/permission, token inválido, endpoint admin, ausência de secrets no cliente.

---

## C — Shell Desktop + UX Base

**Objetivo:** criar a aplicação desktop reutilizando identidade visual sem carregar regras legadas monolíticas.

**Escopo:**
- layout;
- sidebar;
- roteamento;
- topbar;
- estados de carregamento/erro;
- cliente API;
- configuração do servidor;
- notificações/toasts;
- componentes compartilhados;
- padrões de formulários/modais;
- navegação contextual.

**Owns:**
- `apps/desktop/src/app/**`;
- `apps/desktop/src/components/**`;
- `apps/desktop/src/lib/api/**`;
- design tokens/css.

**Não owns:** telas de negócio completas; `src-tauri` após handoff de F0; banco; auth backend.

**Dependência:** F0.

**Critério:** navegação shell funcional com páginas placeholder e mocks tipados, sem Firebase/Next runtime.

---

## D — Configurações Administrativas + Auditoria

**Objetivo:** portar configuração e histórico profissional como serviços centrais.

**Escopo:**
- postos da escala;
- tipos de afastamento;
- especialidades;
- graduações;
- parâmetros permitidos;
- audit_events append-only;
- consulta/paginação/filtros;
- UI administrativa;
- helpers para outros módulos emitirem eventos.

**Owns:**
- `services/api/app/modules/admin_settings/**`;
- `services/api/app/modules/audit/**`;
- `apps/desktop/src/features/admin/**`;
- `apps/desktop/src/features/audit/**`.

**Não owns:** versions/archive do Cardápio; permutas; users/auth.

**Dependência:** F0 + contratos de A para tabelas.

---

## E — Empacotamento, Servidor e Operação Base

**Objetivo:** preparar instalação e operação sem interferir nos módulos de negócio.

**Escopo:**
- `src-tauri` definitivo;
- build Windows;
- configuração do endpoint institucional;
- pacote do servidor;
- health/readiness;
- scripts de instalação/serviço;
- logging operacional;
- backup/restore scripts;
- configuração de ambiente;
- documentação de produção;
- atualização manual controlada na primeira versão.

**Owns:**
- `apps/desktop/src-tauri/**`;
- `infra/prod/**`;
- `ops/**`;
- scripts de backup/restore.

**Dependência:** F0.

**Bloqueios parciais:** P-002 e P-003 para empacotamento final institucional.

---

## F — Efetivo + Afastamentos

**Objetivo:** portar integralmente Efetivo e Afastamentos.

**Escopo:**
- CRUD/inativação de militar;
- especialidades;
- status derivado;
- afastamentos ATIVO/AGENDADO/ENCERRADO/CANCELADO;
- períodos;
- encerramento/cancelamento;
- bloqueio por histórico;
- APIs;
- UI;
- eventos de auditoria.

**Owns:**
- `services/api/app/modules/personnel/**`;
- `services/api/app/modules/absences/**`;
- `apps/desktop/src/features/personnel/**`;
- `apps/desktop/src/features/absences/**`.

**Não owns:** escala, permutas, configurações globais.

**Dependência:** A + C + D.

**Contrato crítico:** status/dutyCount derivados; histórico preservado.

---

## G — Cardápio + Workflow + Versões + Arquivamento

**Objetivo:** portar Cardápio completo sem Saque operacional.

**Escopo:**
- semana de 7 dias;
- editor;
- refeições;
- cortes/kg internos;
- prontidão;
- workflow;
- fechamento operacional;
- responsáveis/cargos declarados;
- snapshots;
- versões;
- reabertura;
- archive/restore;
- busca.

**Owns:**
- `services/api/app/modules/cardapio/**`;
- `apps/desktop/src/features/cardapio/**`.

**Não owns:** Saque operacional, PDFs genéricos, aprovação por identidade.

**Dependência:** A + C + D.

**Contrato crítico:** sem planejamento quantitativo; sem aprovação com identidade real.

---

## H — Documentos e PDFs

**Objetivo:** reproduzir documentos oficiais com paridade e testes próprios.

**Escopo:**
- motor de documentos;
- escala;
- efetivo;
- afastamentos;
- relatório geral;
- cardápio;
- saque;
- preview;
- nomes de arquivo;
- testes de conteúdo/estrutura.

**Owns:**
- `services/api/app/modules/documents/**` e/ou camada de renderização acordada;
- `apps/desktop/src/features/documents/**`;
- templates;
- testes de PDF.

**Não owns:** regras dos domínios-fonte.

**Dependência:** C. Pode iniciar com fixtures congeladas, mas só finaliza após F, G, I e J estabilizarem seus DTOs.

**Sobreposição controlada:** pode precisar de DTOs de outros blocos; não altera os módulos deles.

---

## I — Escalas + Permutas

**Objetivo:** portar escala manual e permutas estruturadas.

**Escopo:**
- calendário/datas;
- feriados;
- postos;
- preenchimento manual;
- limpeza controlada;
- filtros;
- contagem derivada;
- bloqueio exclusivamente por Afastamentos;
- permutas;
- cancelamento;
- histórico;
- API/UI/auditoria.

**Owns:**
- `services/api/app/modules/roster/**`;
- `services/api/app/modules/swaps/**`;
- `apps/desktop/src/features/roster/**`;
- `apps/desktop/src/features/swaps/**`.

**Dependência:** F + D.

**Contrato absoluto:** não criar elegibilidade, ranking, rotação ou seleção automática.

---

## J — Saque de Carnes

**Objetivo:** portar o Saque como módulo operacional independente.

**Escopo:**
- derivação a partir do Cardápio;
- origens;
- cortes/kg;
- descongelamento;
- estados PENDENTE/SEPARADO/RETIRADO;
- histórico;
- filtros/agrupamentos;
- alertas;
- fim de semana/feriado;
- link para Cardápio.

**Owns:**
- `services/api/app/modules/saque/**`;
- `apps/desktop/src/features/saque/**`.

**Dependência:** G + D.

**Contrato crítico:** estado operacional separado do Cardápio, sem dupla contagem.

---

## K — Google Drive / Integrações Externas

**Classificação:** OPCIONAL até P-004.

**Objetivo:** permitir integrações pontuais com internet sem tornar o core dependente delas.

**Escopo:**
- adapter de Drive;
- credenciais apenas no servidor;
- upload/download conforme finalidade aprovada;
- retries;
- timeouts;
- fila de jobs do servidor quando necessária;
- logs/auditoria.

**Owns:**
- `services/api/app/integrations/**`;
- UI estritamente necessária de integração.

**Dependência:** B + E + H e decisão P-004.

**Não deve:** armazenar credencial no Tauri, bloquear operação core quando internet cair.

---

## L — Central Operacional + Calendário + Alertas

**Objetivo:** recompor a visão integrada depois que os módulos-fonte estiverem estabilizados.

**Escopo:**
- cards operacionais;
- calendário;
- alertas cruzados;
- navegação contextual;
- disponibilidade;
- vagas;
- cardápio monitorado;
- saque do dia.

**Owns:**
- `services/api/app/modules/operational/**`;
- `apps/desktop/src/features/operational/**`.

**Dependência:** F + G + I + J + C.

**Regra:** consumir APIs dos domínios; não duplicar regra de domínio.

---

## M — Migração Final Firestore → PostgreSQL

**Objetivo:** certificar a migração real completa.

**Escopo:**
- export real read-only;
- normalização;
- import;
- mapping report;
- rejeições;
- checksums;
- counts;
- idempotência;
- rehearsal;
- runbook de cutover.

**Owns:** `tools/migration/**` na fase final e relatórios de migração.

**Dependência:** A + D + F + G + I + J.

**Não deve:** alterar dados no Firestore, corrigir dados silenciosamente, inventar campos.

---

# 4. Matriz de dependências

| Bloco | Depende de | Pode executar em paralelo com | Não deve alterar |
|---|---|---|---|
| F0 | criação do repo | — | funcionalidades de negócio |
| A | F0 | B, C, D, E | UI/domínio funcional |
| B | F0 + coordenação schema users | A, C, D, E | aprovação do Cardápio |
| C | F0 | A, B, D, E | DB/security backend |
| D | F0 + A contract | B, C, E | Cardápio/Permutas |
| E | F0 | A, B, C, D | módulos de negócio |
| F | A, C, D | G, H, E | Escala/Saque |
| G | A, C, D | F, H, E | Saque operacional |
| H | C; final depende F/G/I/J | F, G; depois I/J | regras dos domínios |
| I | F, D | J, H, E | Cardápio/Saque |
| J | G, D | I, H, E | Cardápio fonte |
| K | B, E, H, P-004 | L/M quando livre | core/banco |
| L | F, G, I, J, C | M, K | regras internas dos módulos |
| M | A, D, F, G, I, J | L, K | origem Firestore |

---

# 5. Ondas

## Fundação

Ativar:
- Coordenador;
- F0.

Não iniciar módulos funcionais antes de F0 estabilizar contratos comuns.

## Onda 1 — infraestrutura paralela

Depois de F0 INTEGRADA:

- A — Dados/Migração base;
- B — Auth/Security base;
- C — Desktop Shell;
- D — Admin/Audit;
- E — Ops/Packaging base.

## Onda 2 — domínios principais

Após A/C/D necessários:

- F — Efetivo/Afastamentos;
- G — Cardápio;
- H — Documentos inicia com fixtures e paridade;
- E continua quando houver trabalho independente.

## Onda 3 — domínios dependentes

- I — Escalas/Permutas, depois de F;
- J — Saque, depois de G;
- H conclui integração documental.

K só entra se P-004 for resolvida e houver necessidade real no ciclo.

## Onda 4 — composição e migração

- L — Central Operacional;
- M — Migração Final;
- K — integração externa opcional.

## Onda 5 — integração/certificação

Conduzida pelo Coordenador:

- integração semântica;
- CI completo;
- testes concorrentes;
- LAN;
- instalação;
- backup/restore;
- migration rehearsal;
- PDFs;
- segurança;
- cutover assistido.

---

# 6. Propriedade global de arquivos

Após F0:

## Somente Coordenador/F0, salvo autorização explícita

- arquivos raiz de toolchain;
- `.github/**`;
- OpenAPI/contratos globais;
- lockfiles;
- roteador global;
- bootstrap FastAPI;
- composição principal;
- configurações de lint/typecheck;
- arquivos de ambiente-template globais.

## Regra para navegação

Trabalhadores não devem todos editar uma sidebar/App global. Cada feature exporta seu descriptor/route local. O Coordenador faz a ligação global na integração.

## Regra para banco

Migrations globais são propriedade de A. Se outro bloco precisar mudar schema:
1. registra requisito no HANDOFF;
2. não cria migration conflitante escondida;
3. A ou Coordenador aplica a alteração na integração.

---

# 7. Branches

No repositório desktop:

- `main` — certificado;
- `integration/desktop-v1` — integradora;
- `work/<bloco>-<slug>` — um trabalhador;
- `integration/<bloco>-review` — somente quando houver reconciliação de alto risco.

Nunca dois chats na mesma branch trabalhadora.

---

# 8. HANDOFF obrigatório

Cada trabalhador entrega:

~~~text
# BLOCO-X — HANDOFF

Branch:
HEAD:
Base:
Status: EM REVISÃO

## Objetivo executado
## Arquivos alterados
## Arquitetura anterior
## Arquitetura nova
## Contratos preservados
## Alterações funcionais
## Alterações visuais
## Banco/schema/APIs
## Segurança
## Métricas
## Testes executados
Comando → resultado
## CI
## Riscos
## Dependências
## Conflitos previstos
## Trabalho não realizado
## Confirmações
- sem merge em main
- sem deploy/cutover
- sem alteração fora do escopo
- sem integração de outras frentes
~~~

Depois: **PARAR**.

---

# 9. Classificação de falhas de CI

## TIPO 1 — regressão da própria frente
Trabalhador corrige.

## TIPO 2 — guard desatualizado pela refatoração da própria frente
Pode atualizar o guard se preservar a semântica.

## TIPO 3 — falha cruzada
Registrar e entregar ao Coordenador. Não invadir outra frente.

## TIPO 4 — falha preexistente/fora do escopo
Registrar. Não corrigir automaticamente.

---

# 10. Integração semântica

Nunca resolver código funcional compartilhado com “ours/theirs” por conveniência.

Procedimento:

1. confirmar HEADs;
2. confirmar base;
3. comparar arquivos;
4. identificar contratos;
5. verificar schema/API;
6. revisar segurança;
7. revisar testes;
8. combinar comportamentos;
9. rodar gates proporcionais;
10. atualizar status;
11. atualizar Memorial se houver mudança estrutural.

---

# 11. Critérios de promoção para main

Somente quando:

- todos os blocos obrigatórios estiverem INTEGRADOS;
- decisões pendentes necessárias ao ambiente real estiverem resolvidas;
- migração rehearsal tiver relatório aprovado;
- backup/restore tiver teste real;
- instalador tiver sido testado em máquina limpa;
- dois clientes simultâneos tiverem sido validados;
- documentos tiverem paridade aprovada;
- testes de segurança estiverem verdes;
- operação sem internet externa tiver sido validada;
- usuário autorizar o cutover.
