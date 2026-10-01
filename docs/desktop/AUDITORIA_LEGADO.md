# Auditoria do sistema legado — baseline para migração desktop

## 1. Baseline real auditado

A auditoria foi feita sobre `main@a853c288d7f6bdaa49987e1b7432b8eaf7e7c4d2`.

Esse commit integra o Bloco 6 — fechamento operacional do Cardápio. O CI do commit concluiu com sucesso. O status de Vercel do mesmo commit falhou por limite de deployment, não por erro de build; isso deixa de ser relevante no produto desktop, mas confirma que hospedagem pública não deve ser tratada como requisito da nova arquitetura.

O repositório não possui README na raiz. A documentação existente é concentrada em `docs/FIREBASE.md` e em registros pontuais como `BLOCK4A_AUDIT.md`.

## 2. Arquitetura atual

### Frontend

- Next.js 15 / App Router.
- React 19 + TypeScript.
- Tailwind CSS.
- Motion para animações.
- Aplicação essencialmente client-side.
- `app/page.tsx` concentra grande parte do domínio de Efetivo, Afastamentos, Escala, navegação e coordenação.
- `components/CardapioSemanal.tsx` concentra modelo, editor, workflow, versões, geração de saque e PDFs do Cardápio.

### Persistência

- Firebase Authentication.
- Cloud Firestore.
- Cache/recovery em localStorage.
- Camada própria de controle de revisão, mutationId, tombstone e conflito.
- Sincronização com `onSnapshot`.
- Escritas por transação.
- Coleções atuais:
  - `aprov_workspaces/hgesm/roster/principal`
  - `aprov_workspaces/hgesm/cardapios/{id}`
  - `aprov_workspaces/hgesm/saques/{id}`

### Autenticação atual

O código atual autoriza somente a conta Google `aprov1hgesm@gmail.com`, exigindo email verificado. As Firestore Rules reproduzem essa restrição.

### Divergência documental importante

`docs/FIREBASE.md` ainda descreve uma estratégia anterior baseada em `aprov_members/{uid}` e papéis reader/editor/admin. O código e as Rules atualmente presentes em `main` não usam esse modelo: usam uma conta única autorizada por email. Para a migração desktop, **o código atual é a referência factual** e essa divergência não deve ser carregada para o novo sistema.

## 3. Domínios funcionais existentes

### Central Operacional

- indicadores de efetivo disponível;
- postos vagos;
- situação do cardápio;
- saques de carnes;
- alertas cruzados;
- calendário operacional de 14 dias.

### Efetivo

- cadastro e edição de militar;
- posto/graduação;
- nome e nome completo;
- matrícula;
- especialidade primária/secundária;
- tipo EP/EV/Ambas;
- status derivado de afastamentos;
- contagem de serviços derivada da escala;
- preservação de histórico antes de exclusão.

### Afastamentos

- estados ATIVO, AGENDADO, ENCERRADO e CANCELADO;
- período definido ou indefinido;
- encerramento com preservação histórica;
- bloqueio de militar afastado na escala.

### Escalas

- seleção de militares é totalmente manual;
- Afastamentos é o único bloqueio de disponibilidade;
- tipos EP, EV, PERM e DISP;
- DISP não conta como serviço preenchido;
- preservação de histórico de datas e postos;
- feriados customizados;
- filtros de finais de semana/feriados/período;
- reconciliação com postos administrativos.

### Permutas

- registro estruturado;
- militar original e substituto;
- posto e data;
- estado operacional ATIVA/CONCLUIDA/CANCELADA;
- cancelamento sem sobrescrever alterações posteriores.

### Cardápio Semanal

- semana de 7 dias;
- dados institucionais;
- café/ceia, colação, almoço geral, almoço paciente, jantar paciente e ceia;
- cortes e kg internos para Saque;
- workflow EM_ELABORACAO → CONFERIDO → APROVADO → FINALIZADO;
- prontidão antes de avanço;
- responsáveis/cargos declarados;
- fechamento operacional estruturado;
- reabertura com motivo;
- versionamento;
- arquivamento/restauração;
- cardápio arquivado somente leitura.

### Saque de Carnes

- origem ALMOÇO GERAL, ALMOÇO PACIENTE e JANTAR PACIENTE;
- corte, kg, consumo, retirada e prazo de descongelamento;
- estados PENDENTE, SEPARADO e RETIRADO;
- histórico separado do Cardápio;
- alertas de atraso, hoje, futuro e fim de semana/feriado;
- visões por retirada, consumo e corte.

### Fluxos Profissionais

- histórico/auditoria estruturada;
- configurações administrativas;
- permutas;
- versões;
- arquivamento/restauração.

### Documentos

- PDFs de escala, efetivo, afastamentos, relatório geral, cardápio e saque;
- geração atual majoritariamente no cliente com jsPDF/html2canvas.

## 4. Contratos de domínio já extraídos

Há lógica reutilizável em `lib/domain`:

- `roster-integrity.ts`
- `roster-operations.ts`
- `cardapio-readiness.ts`
- `cardapio-closure.ts`
- `professional-flows.ts`
- `saque-operacional.ts`
- `operational-calendar.ts`
- `operational-navigation.ts`

Esses arquivos são referências importantes para preservar comportamento, mas não devem ser copiados cegamente. O novo backend deve ser autoridade sobre regras e persistência compartilhada.

## 5. Testes existentes

O workflow `.github/workflows/validate.yml` executa:

- TypeScript;
- persistência/recovery;
- integridade funcional;
- calendário operacional;
- Fluxos Profissionais;
- Blocos 4A e 4B;
- Saque de Carnes;
- fechamento operacional do Cardápio;
- regra de escala manual;
- regressão do saque de paciente;
- Firestore emulator e Rules;
- build de produção;
- smoke de navegador;
- smoke de PDFs.

Esses testes formam a base de regressão para a migração. A nova aplicação não precisa reproduzir a mesma infraestrutura de testes, mas deve preservar a semântica dos contratos cobertos.

## 6. Principais dívidas e riscos

1. `app/page.tsx` tem aproximadamente 165 KB e concentra muitos domínios.
2. `components/CardapioSemanal.tsx` tem aproximadamente 209 KB e mistura dados, regras, UI, workflow, PDF e Saque.
3. Tipos de domínio importantes ainda vivem dentro de componentes.
4. A persistência é fortemente acoplada ao Firestore.
5. A autenticação é de conta única, incompatível com o objetivo de intranet multiusuário.
6. Auditoria atual está dentro do documento de roster e possui retenção configurável; no desktop ela deve virar trilha append-only no servidor.
7. O cliente atual contém dados iniciais/mock que não devem se tornar dados de produção automaticamente.
8. A geração de PDF depende do DOM e deve ser validada cuidadosamente na migração.
9. O projeto atual é público no GitHub; o novo projeto deve ser avaliado quanto à visibilidade institucional e presença de dados/credenciais.
10. O mecanismo de sincronização Firestore não deve ser transportado para PostgreSQL como se fosse requisito: na intranet a API central será a autoridade.

## 7. Partes com alto potencial de reaproveitamento

- componentes visuais e identidade da interface;
- regras puras de domínio de `lib/domain`;
- contratos funcionais cobertos por testes;
- textos, labels, fluxos de UI;
- templates de documentos como referência visual;
- fixtures e cenários de teste;
- regras de prontidão, ausência, fechamento e saque.

## 8. Partes que devem ser substituídas

- Firebase Auth;
- Firestore;
- Firestore Rules;
- `useCloudData` e camada de sincronização Firestore;
- cache de escrita offline baseado em localStorage;
- dependência de Vercel;
- AuthGate Google;
- modelo de “um grande documento roster/principal” como banco central.

## 9. Conclusão da auditoria

A migração deve ser tratada como **novo produto desktop/intranet com reaproveitamento seletivo**, não como empacotamento superficial do site. A interface React e regras de domínio são ativos aproveitáveis; autenticação, persistência, infraestrutura e autoridade de dados precisam ser redesenhadas.
