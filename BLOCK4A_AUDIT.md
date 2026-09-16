# Bloco 4A — Auditoria funcional

Este ciclo revisa fluxos existentes do Gestão Aprov e corrige inconsistências antes dos próximos blocos de maturidade operacional.

## Correções incorporadas

- limpeza da escala limitada às datas atuais/futuras visíveis, preservando histórico passado e períodos fora do filtro;
- remoção de feriados sem destruição de colunas que contenham histórico operacional;
- postos da escala reconciliados com as Configurações Administrativas, removendo somente postos obsoletos vazios;
- criação de novas datas da escala usando os postos administrativos atualmente configurados;
- filtros de 4/8 finais de semana ancorados na data atual, sem permanecer presos às primeiras datas históricas persistidas;
- edição do efetivo alinhada aos postos/graduações e especialidades administrativas, preservando valores históricos;
- exclusão de militar bloqueada também quando existir histórico de permutas;
- alterações rápidas de especialidade registradas no histórico estruturado;
- ciclo operacional das permutas distinguindo ATIVA, CONCLUÍDA e CANCELADA;
- permuta ativa encerrada quando o mesmo posto sofre alteração posterior;
- normalização visual de graduação/nome em células legadas e relatórios PDF;
- redefinição operacional preservando histórico profissional e configurações administrativas;
- Ajuda & Informações funcional;
- cardápio arquivado tratado como somente leitura na interface;
- duplicação de cardápio arquivado limpa os metadados de arquivamento da nova semana.

## Fora do escopo por decisão de produto

- Planejamento quantitativo de refeições;
- Aprovação com identidade real;
- Planejamento de Aprovisionamento.

## Validação

O CI inclui testes específicos de domínio e regressão estrutural para as correções deste bloco, além da suíte já existente de persistência, Firestore, build, dois navegadores e PDFs.
