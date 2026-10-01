# COORDENADOR HANDOFF — Gestão Aprov Desktop

## Missão do Coordenador

Manter a visão global da migração, impedir sobreposição destrutiva, revisar handoffs e realizar integrações semânticas. O Coordenador não compete com chats trabalhadores.

## Estado atual

Planejamento concluído. Implementação desktop ainda não iniciada.

### Repositório legado

`aprov-hgesm/Gest-o-Aprov---H-Ge-SM`

Main auditada:
`a853c288d7f6bdaa49987e1b7432b8eaf7e7c4d2`

Esse baseline contém Bloco 5 — Saque operacional e Bloco 6 — fechamento operacional do Cardápio. O CI de main está verde. A hospedagem Vercel sofreu rate limit, mas o desktop não dependerá dela.

### Branch de planejamento

`planning/desktop-intranet-master`

Ela contém somente documentação/governança.

### Repositório-alvo

Recomendado:
`aprov-hgesm/Gestao-Aprov-Desktop`

Ainda não criado nesta missão.

## Documentos que o próximo Coordenador deve ler

1. `docs/desktop/MEMORIAL_OFICIAL.md`
2. `docs/desktop/AUDITORIA_LEGADO.md`
3. `docs/desktop/DECISIONS.md`
4. `docs/desktop/EXECUCAO_PARALELA.md`
5. `docs/desktop/INTEGRATION_STATUS.md`
6. este arquivo;
7. `docs/desktop/PROMPTS.md`.

## Próximo passo exato

1. criar o novo repositório;
2. copiar `docs/desktop/**` como documentação inicial;
3. criar `main` e `integration/desktop-v1`;
4. atualizar este handoff com os HEADs reais;
5. ativar apenas Chat F0;
6. revisar o HANDOFF F0;
7. integrar F0;
8. liberar Onda 1: A, B, C, D e E.

## Contratos que não devem ser rediscutidos sem nova evidência

- desktop/intranet é a arquitetura-alvo;
- novo repositório separado;
- PostgreSQL central;
- API Python/FastAPI;
- Tauri + React/TypeScript no cliente;
- cliente sem acesso direto ao banco;
- escala totalmente manual;
- Afastamentos é o único bloqueio automático;
- Saque separado do Cardápio;
- workflow do Cardápio com responsáveis declarados, não autenticados;
- auditoria append-only no novo backend;
- sem fila de escrita offline na V1;
- fora de escopo: planejamento quantitativo de refeições, aprovação com identidade real e planejamento de Aprovisionamento.

## Pontos de atenção

### Monólitos legados

Não copiar `app/page.tsx` nem `CardapioSemanal.tsx` como núcleo arquitetural do novo sistema. Reaproveitar visual/regras por extração controlada.

### Tipos de domínio

Tipos hoje dentro dos componentes precisam virar contratos formais no backend/OpenAPI.

### Banco

Não permitir que cada domínio invente migrations paralelas. Bloco A é owner do schema/migrations. Outros blocos requisitam mudanças no HANDOFF.

### Navegação global

Não permitir que todos editem sidebar/router global. Cada feature entrega seu módulo; Coordenador faz wiring na integração.

### Auth

P-001 está pendente. Não confundir autenticação comum do sistema com “aprovação com identidade real”, que segue fora de escopo.

### Dados reais

Migração real só ocorre no Bloco M. Até lá, usar fixtures/snapshots anonimizados quando possível.

## Critérios do Coordenador ao revisar uma frente

- escopo respeitado;
- ownership respeitado;
- contrato congelado preservado;
- nenhum secret;
- segurança deny-by-default;
- testes proporcionais;
- CI classificado corretamente;
- schema/API compatível;
- handoff completo;
- nenhuma integração/deploy indevida.

## Troca futura de Coordenador

Antes da troca:

1. atualizar Memorial se houve mudança estrutural;
2. atualizar Integration Status;
3. atualizar este Handoff;
4. registrar HEAD da integradora;
5. registrar HEAD de cada trabalhador ativo;
6. listar conflitos em aberto;
7. registrar próxima ação exata.

O novo Coordenador deve conseguir continuar sem ler conversas anteriores.
