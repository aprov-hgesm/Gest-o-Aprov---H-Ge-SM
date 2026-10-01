# MEMORIAL OFICIAL — Gestão Aprov Desktop/Intranet

> Documento canônico. Qualquer chat novo deve lê-lo antes de atuar.

## 1. Identidade do sistema

**Nome de produto:** Gestão Aprov Desktop.

**Propósito:** apoiar rotinas internas do Aprovisionamento do HGeSM em ambiente de intranet institucional, com operação desktop, banco central local e internet apenas como serviço auxiliar quando explicitamente necessário.

**Produto legado de referência:** `aprov-hgesm/Gest-o-Aprov---H-Ge-SM`, baseline `main@a853c288d7f6bdaa49987e1b7432b8eaf7e7c4d2`.

**Repositório-alvo recomendado:** `aprov-hgesm/Gestao-Aprov-Desktop`.

O repositório legado permanece congelado como referência funcional e fonte de migração até a certificação do desktop.

## 2. Decisão arquitetural central

O produto futuro deixa de ser uma aplicação web pública hospedada.

Arquitetura-alvo:

~~~text
PC Windows 1 ─┐
PC Windows 2 ─┼── LAN institucional ── API Gestão Aprov ── PostgreSQL
PC Windows N ─┘                           │
                                          ├── documentos/backups locais
                                          └── internet opcional
                                              └── Google Drive / integrações autorizadas
~~~

### Cliente desktop

- Tauri 2;
- React;
- TypeScript;
- interface reaproveitada seletivamente do sistema legado;
- cliente sem credenciais de banco;
- configuração explícita do endereço da API institucional;
- sem servidor Next.js no cliente final.

### Backend

- Python;
- FastAPI;
- Pydantic;
- SQLAlchemy 2;
- Alembic;
- API REST versionada em `/api/v1`;
- OpenAPI como contrato de integração;
- servidor como autoridade de regras compartilhadas;
- integrações externas executadas preferencialmente no servidor.

### Banco

- PostgreSQL central na intranet;
- migrations versionadas;
- constraints no banco e validação no backend;
- controle otimista de concorrência por `row_version`/versão equivalente;
- auditoria append-only.

## 3. Princípios de operação

1. A operação normal depende da LAN institucional, não da internet pública.
2. Internet externa não é autoridade para funcionalidades essenciais.
3. O cliente desktop nunca conecta diretamente ao PostgreSQL.
4. O cliente não contém secrets de banco, Drive ou integrações institucionais.
5. V1 não terá fila de escrita offline distribuída. Se o servidor interno estiver indisponível, gravações ficam bloqueadas com erro explícito.
6. Preferências estritamente locais podem ficar no cliente.
7. Conflitos de edição não podem resultar em overwrite silencioso.
8. A migração do Firestore é read-only no lado de origem, reproduzível e idempotente.
9. O desktop não reintroduz regras automáticas de escala.

## 4. Domínios

- Central Operacional;
- Efetivo;
- Afastamentos;
- Escalas;
- Permutas;
- Cardápio Semanal;
- Fechamento operacional do Cardápio;
- versões do Cardápio;
- arquivamento/restauração;
- Saque de Carnes;
- Histórico/Auditoria;
- Configurações Administrativas;
- Documentos/PDF;
- Administração de usuários/acesso;
- integrações externas opcionais;
- backup/restore e operação do servidor.

## 5. Contratos congelados

Nenhum chat trabalhador pode alterar estes comportamentos sem decisão explícita do usuário + Coordenador.

### Escala

- seleção de militar é totalmente manual;
- o único bloqueio automático de seleção é estar afastado na data;
- especialidade, quantidade de serviços, dia anterior/posterior, mesmo dia e tipo EP/EV não escolhem nem ordenam automaticamente;
- `DISP` não conta como posto preenchido nem como serviço;
- histórico de escala já usado não é apagado silenciosamente;
- postos antigos preenchidos permanecem rastreáveis.

### Efetivo/Afastamentos

- status atual do militar é derivado dos afastamentos;
- afastamento futuro = AGENDADO;
- afastamento encerrado preserva histórico;
- afastamento cancelado não bloqueia escala;
- exclusão de militar com histórico é bloqueada ou tratada por mecanismo explícito de inativação;
- dutyCount é derivado, não editado como autoridade.

### Cardápio

- semana contém 7 dias;
- workflow: EM_ELABORACAO → CONFERIDO → APROVADO → FINALIZADO;
- prontidão é validada antes de avanço;
- finalização preserva versão/snapshot;
- reabertura exige motivo e cria novo ciclo;
- responsáveis e cargos permanecem **declarados**;
- nenhuma etapa implica autenticação criptográfica do aprovador;
- arquivado = somente leitura até restauração.

### Saque

- Saque é derivado do Cardápio;
- estado operacional do Saque é separado do conteúdo do Cardápio;
- origens: ALMOÇO GERAL, ALMOÇO PACIENTE, JANTAR PACIENTE;
- cortes e kg não são inferidos de texto livre;
- prazo de descongelamento segue regra explícita;
- transições PENDENTE → SEPARADO → RETIRADO preservam histórico;
- não duplicar kg em consolidações.

### Histórico/Auditoria

- eventos persistidos no novo sistema são append-only;
- correções geram novos eventos; não reescrevem eventos anteriores;
- toda ação sensível deve carregar timestamp do servidor;
- quando houver usuário autenticado, auditoria técnica registra a conta; isso **não** transforma o fluxo do Cardápio em “aprovação com identidade real”.

### Documentos

- documentos aprovados no legado servem como referência visual/funcional;
- mudança de layout institucional exige validação específica;
- PDF deve representar os mesmos dados que a tela/documento oficial correspondente.

## 6. Funcionalidades explicitamente fora de escopo

Até nova decisão do usuário:

- Planejamento quantitativo de refeições;
- Aprovação com identidade real;
- Planejamento de Aprovisionamento.

Nenhum trabalhador deve criar versões disfarçadas dessas funções.

## 7. Modelo lógico inicial do PostgreSQL

A fundação deve transformar isto em migrations reais, preservando semântica:

- `users`, `roles`/permissions, sessões ou equivalentes;
- `military`;
- `absences`;
- `holidays`;
- `roster_days`;
- `roster_assignments`;
- `swaps`;
- `admin_settings`;
- `audit_events`;
- `cardapios` com metadados indexáveis e conteúdo estruturado;
- `cardapio_versions` com snapshot;
- `cardapio_closure_events`;
- `saque_operational_records`;
- `integration_jobs`/metadados quando necessário;
- `migration_provenance` para rastrear importação do legado.

Cardápio pode utilizar JSONB para estruturas alimentares complexas, desde que campos de busca/relacionamento necessários sejam explícitos e indexáveis. Não normalizar apenas por estética.

## 8. Contrato de API

- base `/api/v1`;
- JSON UTF-8;
- erros com código estável, mensagem humana e correlation/request id;
- validação server-side obrigatória;
- recursos mutáveis expõem versão de concorrência;
- alteração com versão stale retorna conflito, nunca overwrite;
- paginação para histórico e auditoria;
- endpoints administrativos protegidos por permissão;
- OpenAPI versionado;
- cliente TypeScript gerado ou validado contra o OpenAPI, evitando contratos duplicados manualmente.

## 9. Segurança

- princípio do menor privilégio;
- API é o único caminho normal para dados;
- banco não exposto a estações clientes;
- bind de serviços restrito à interface de rede necessária;
- TLS interno é recomendado para produção;
- secrets apenas no servidor;
- logs não podem gravar senha/token;
- validação de entrada em todas as rotas;
- auditoria de operações sensíveis;
- nenhuma falha de autenticação/autorização pode resultar em fail-open.

## 10. Autenticação

A arquitetura deve suportar um `AuthProvider`/adaptador para evitar acoplamento.

**Decisão pendente de produção:** contas locais do Gestão Aprov versus Active Directory/LDAP/SSO institucional.

A fundação pode implementar autenticação de desenvolvimento/teste e a abstração, mas o provedor institucional definitivo não deve ser inventado por um trabalhador.

## 11. Dados e migração

Fontes possíveis:

1. export administrativo/read-only do Firestore;
2. JSON de recuperação do sistema legado, como fallback.

Regras:

- origem nunca é alterada;
- dry-run obrigatório;
- validação por contagem, IDs e checksums;
- relatório de rejeições;
- importação idempotente;
- provenance de cada lote;
- possibilidade de repetir migração em ambiente de teste;
- corte final somente após congelamento do legado e backup.

## 12. Backups

PostgreSQL deve possuir:

- backup automatizado;
- retenção configurada;
- restore testado;
- cópia fora do host primário;
- relatório de sucesso/falha;
- procedimento documentado de recuperação.

Integração com Drive pode ser um destino adicional, nunca o único backup.

## 13. Política de testes

### Gates permanentes de toda PR

- diff hygiene;
- frontend typecheck;
- Python lint/format check;
- Python typecheck;
- unit/domain tests do bloco;
- contract/API tests do bloco;
- build dos artefatos afetados.

### Gates seletivos

- PostgreSQL integration tests: toda mudança de persistência;
- security tests: auth/permissões/admin;
- browser/Tauri E2E: navegação, interação complexa, teclado, modais, instalação;
- PDF tests: qualquer mudança de documento;
- migration tests: qualquer mudança de schema/importação;
- backup/restore test: infraestrutura de dados.

### Certificação final

- suíte combinada;
- teste concorrente com dois clientes;
- teste em LAN;
- instalação limpa em Windows;
- upgrade de versão;
- backup + restore;
- migração completa de cópia dos dados;
- PDFs;
- permissões;
- falha de internet externa sem perda da operação central.

## 14. Modelo de execução paralela

O projeto utiliza:

> fundação comum → chats trabalhadores independentes → integração semântica pelo Coordenador → certificação → main.

Chats trabalhadores:

- uma branch por chat;
- um bloco por chat;
- sem merge em main;
- sem deploy;
- sem integração de outra branch;
- sem ampliar escopo;
- sem alterar contrato congelado;
- HANDOFF obrigatório e parada.

## 15. Branches do novo repositório

- `main`: estado certificado;
- `integration/desktop-v1`: branch integradora;
- `work/f0-foundation`;
- `work/a-data-migration`;
- `work/b-auth-security`;
- `work/c-desktop-shell`;
- `work/d-admin-audit`;
- `work/e-ops-packaging`;
- `work/f-personnel-absences`;
- `work/g-cardapio`;
- `work/h-documents`;
- `work/i-roster-swaps`;
- `work/j-saque`;
- `work/k-drive`;
- `work/l-central-operational`;
- `work/m-final-migration`.

## 16. Estado atual

- Auditoria do legado: CONCLUÍDA.
- Planejamento/Governança: CONCLUÍDO nesta branch.
- Repositório desktop: NÃO CRIADO NESTA ETAPA.
- Implementação desktop: NÃO INICIADA.
- Próxima ação: criar o repositório-alvo, copiar estes documentos para ele, ativar Chat Coordenador e Chat F0.

## 17. Decisões ainda pendentes

Não bloquear o que for independente.

- P001 — autenticação de produção: local ou AD/LDAP/SSO.
- P002 — host de produção: Windows Server/desktop dedicado, Linux/VM, Docker permitido ou instalação nativa.
- P003 — assinatura de código e formato final de distribuição do instalador.
- P004 — credencial/conta institucional que executará eventual integração com Drive.

O Coordenador deve obter essas decisões antes dos blocos que realmente dependem delas.
