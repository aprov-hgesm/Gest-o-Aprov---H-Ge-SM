# Integração do Gestão de Aprov com o Firebase

## Escopo desta etapa

Projeto: `gestao-aprov-h-ge-sm`, Firestore `(default)`.
O login permanece para a próxima etapa. As funções existentes de autenticação não foram conectadas à interface.

A aplicação lê as coleções com `onSnapshot` e grava por transações com controle de revisão:

| Caminho | Conteúdo |
| --- | --- |
| `aprov_workspaces/hgesm/roster/principal` | Efetivo, afastamentos, escalas, feriados e histórico operacional |
| `aprov_workspaces/hgesm/cardapios/{id}` | Um cardápio por semana, incluindo refeições, dados institucionais, fluxo de conferência e saque de carnes |

O agrupamento da escala é intencional: uma alteração em um militar e nos seus vínculos é confirmada atomicamente.
Cada documento tem schemaVersion, revision, mutationId, deleted e updatedAt do servidor.
O limite preventivo é 800 KB por registro. O histórico operacional existente não é uma trilha de auditoria imutável.

## Dados locais e migração

As antigas chaves `dr_military`, `dr_absences`, `dr_roster`, `dr_logs`, `dr_holidays` e `dr_cardapios` permanecem intactas.
A rotina automática que apagava os dados durante a inicialização foi removida.

1. Abra cada módulo no navegador que contém os dados antigos.
2. Aguarde a conexão e expanda o indicador de sincronização.
3. Use **Exportar recuperação** para obter uma cópia.
4. Use **Enviar dados locais**. A importação cria apenas registros ausentes e aceita registros já idênticos.
5. Um identificador já ocupado por dados diferentes ou marcado como excluído gera um conflito; nada é sobrescrito automaticamente.
6. Em conflito, exporte a recuperação para comparar as versões. **Usar versão do servidor** guarda uma cópia local antes de trocar a versão exibida.

Os modelos iniciais não são enviados ao abrir a página.
A preferência de semana selecionada permanece local a cada navegador.

## Gravação, conexão e recuperação

A nova cópia local usa `gestao-aprov:firestore:v1:{colecao}`.
Ela inclui a versão que foi editada e operações pendentes. A interface só confirma salvamento após resposta do servidor.
Alterações próximas são agrupadas com uma espera de 700 ms, e operações são serializadas.
A identificação de cada operação permite recuperar um envio confirmado pelo servidor cuja resposta se perdeu.
Uma transação não sobrescreve uma revisão modificada por outro dispositivo.
Quando o navegador perde conexão, o rascunho permanece local e a reconexão tenta novamente.
Se não houver espaço ou permissão para armazenamento local, o indicador solicita exportar antes de fechar.
Se uma cópia local for ilegível, seus bytes originais não são substituídos.

O recurso de recuperação exporta JSON para comparação/restauração técnica; não há uma tela de importação arbitrária de arquivos nesta etapa.

## Regras e ativação no projeto real

Este commit não publica regras nem modifica dados do projeto Firebase real.
As chamadas da aplicação respeitam as regras que já estiverem publicadas.
Se essas regras exigirem autenticação, a tela apresenta o bloqueio e mantém os dados locais pendentes.

O arquivo `firestore.rules` é uma base restrita para a próxima etapa de login: exige usuário autenticado e cadastro habilitado em `aprov_members/{uid}`.
O cadastro contém `enabled: true` e `role: reader | editor | admin`. Apenas editor/admin podem gravar.
Esse cadastro é provisionado pelo console/Admin SDK e não pode ser alterado pelo cliente.
Não publique essas regras esperando acesso sem login. Elas não concedem leitura ou escrita pública.

Depois da implementação do login e da configuração dos membros, o responsável pelo projeto poderá publicar:
```bash
firebase deploy --only firestore:rules,firestore:indexes --project gestao-aprov-h-ge-sm
```

## Validação

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run test:firestore
bun run build
```

Os testes de integração usam exclusivamente o emulador local e o projeto fictício `demo-aprov`.
Eles exercitam as mesmas regras restritas: acesso não autenticado negado, gravação por membro autorizado,
controle de revisão, idempotência, escuta em tempo real e proibição de alteração de permissões pelo cliente.
O workflow do GitHub executa essas verificações em cada alteração.
A validação no emulador não confirma domínios, provedores, regras publicadas ou acesso ao projeto real.
