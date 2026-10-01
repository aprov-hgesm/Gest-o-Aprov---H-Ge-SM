# DECISIONS — Gestão Aprov Desktop

## D-001 — Produto desktop/intranet

**Decisão:** o novo Gestão Aprov será operado como aplicativo desktop em intranet institucional. A web pública deixa de ser arquitetura-alvo.

## D-002 — Repositório separado

**Decisão:** o desenvolvimento desktop deve ocorrer em novo repositório, recomendado como `aprov-hgesm/Gestao-Aprov-Desktop`.

O repositório web permanece congelado como legado de referência até o cutover.

## D-003 — Arquitetura cliente-servidor

**Decisão:** múltiplos clientes desktop acessam uma API central na LAN. Não haverá banco independente por estação.

## D-004 — Cliente

**Decisão:** Tauri 2 + React + TypeScript.

O objetivo é reaproveitar componentes e experiência visual, sem carregar o servidor Next.js para cada estação.

## D-005 — Backend

**Decisão:** Python + FastAPI + Pydantic + SQLAlchemy + Alembic.

## D-006 — Banco central

**Decisão:** PostgreSQL.

SQLite pode ser usado apenas em testes isolados quando compatível; não é o banco multiusuário de produção.

## D-007 — Autoridade de dados

**Decisão:** cliente desktop nunca acessa PostgreSQL diretamente. Toda leitura/gravação compartilhada passa pela API.

## D-008 — Escrita offline

**Decisão:** a V1 não terá fila de escrita offline distribuída. Perda do servidor/LAN bloqueia gravações e apresenta erro explícito. Isso evita reimplementar a complexidade de sincronização Firestore sem necessidade operacional comprovada.

## D-009 — Internet externa

**Decisão:** integrações externas são auxiliares. Sempre que possível, são executadas no servidor. Falha da internet externa não deve impedir Efetivo, Afastamentos, Escalas, Cardápio, Saque ou consultas locais.

## D-010 — Escala manual

**Decisão congelada:** a seleção continua totalmente manual. O único bloqueio automático é Afastamentos cobrindo a data.

## D-011 — Exclusões de produto

**Decisão congelada:** ficam fora:
- Planejamento quantitativo de refeições;
- Aprovação com identidade real;
- Planejamento de Aprovisionamento.

## D-012 — Cardápio no PostgreSQL

**Decisão:** usar modelo híbrido. Metadados pesquisáveis/relacionais ficam em colunas explícitas; estruturas alimentares complexas e snapshots podem usar JSONB. Não criar dezenas de tabelas apenas para normalização formal.

## D-013 — Concorrência

**Decisão:** recursos mutáveis terão versão otimista. Update sobre versão stale retorna conflito e exige reload/reconciliação.

## D-014 — Auditoria

**Decisão:** auditoria persistida no servidor é append-only. Eventos não são alterados/deletados pela aplicação comum.

## D-015 — Migração

**Decisão:** a origem Firestore é somente leitura durante ferramentas de migração. Importação é dry-run primeiro, idempotente e acompanhada de relatório/provenance.

## D-016 — Testes E2E

**Decisão:** Browser/Tauri E2E é gate seletivo, não obrigatório para toda alteração. Deve ser usado quando o risco for interativo.

## D-017 — Documentos

**Decisão:** a migração deve manter paridade funcional e visual dos documentos aprovados. A tecnologia de geração pode mudar, desde que os testes de documento sejam aprovados.

## D-018 — Shared files

**Decisão:** após F0, arquivos globais e contratos compartilhados são de propriedade do Coordenador/Fundação. Trabalhadores não editam `.github`, contratos globais, root configs ou roteador global salvo autorização de integração.

---

# Decisões pendentes do usuário

## P-001 — Provedor de autenticação de produção

Opções:
- usuários locais do Gestão Aprov;
- Active Directory/LDAP/SSO institucional;
- combinação com fallback administrativo controlado.

Não inventar resposta. O bloco de segurança deve manter adaptador abstrato até decisão.

## P-002 — Servidor de produção

Definir ambiente real:
- Windows;
- Linux/VM;
- Docker permitido ou não;
- hostname/DNS;
- backup em share institucional.

Desenvolvimento pode usar Docker Compose sem assumir que produção usará Docker.

## P-003 — Distribuição e assinatura

Definir se haverá:
- MSI;
- MSIX;
- assinatura de código;
- distribuição via pasta de rede, GPO, Intune ou instalação manual.

## P-004 — Google Drive

Definir:
- conta autorizada;
- pasta(s);
- escopos;
- finalidade exata;
- política de retenção.

O core desktop não depende desta decisão.
