# Estado do Sistema: Funcionalidades

Abaixo encontram-se tabelas detalhadas com o resumo de tudo o que já foi implementado no sistema de Gestão de Folha Salarial e as ideias/sugestões que estão pendentes para futuro desenvolvimento.

## ✅ Funcionalidades Feitas (Implementadas)

| Funcionalidade | Descrição | Perfil de Acesso | Estado |
| :--- | :--- | :--- | :--- |
| **Responsividade Global no Mobile** | A interface das páginas de Docentes, Lançamentos, Relatórios e Auditoria foi adaptada para funcionar perfeitamente em dispositivos móveis. | Todos | ✔️ Concluído |
| **Melhoria da UX no Lançamento de Horas** | O botão de gravação foi renomeado para "Salvar horas lançadas" e a área do docente ativo ganha agora maior destaque visual quando selecionado na aba individual. | Administrador / Diretor | ✔️ Concluído |
| **Restrição de Acesso aos Docentes** | Os Diretores de Curso agora só podem ver os docentes que pertencem ao seu próprio curso (em modo leitura, sem permissões de editar/eliminar). | Diretor de Curso | ✔️ Concluído |
| **Edição de Perfil de Utilizador** | Utilizadores podem agora alterar a sua senha e o seu Nome de Utilizador através do menu superior. | Todos | ✔️ Concluído |
| **Legendas em Relatórios** | Foram adicionadas legendas (AP - Aulas Programadas; AD - Aulas Dadas) nas pré-visualizações e impressões das folhas salariais para facilitar a leitura. | Todos | ✔️ Concluído |
| **Sistema de Alerta de Feriados Nacionais** | Implementação de alertas visuais no Dashboard e Lançamento de Horas sempre que o mês ativo coincidir com meses que tenham feriados, relembrando o desconto de horas. | Administrador / Diretor | ✔️ Concluído |
| **Quadro de Avisos / Notificações** | Área no topo do Dashboard onde a Direção (Administrador) pode publicar mensagens críticas para leitura obrigatória de todos os Diretores de Curso. | Administrador / Diretor | ✔️ Concluído |
| **Analytics e Gráficos Financeiros** | Painel analítico exclusivo para o Admin contendo gráficos da evolução de custos salariais (linha), rácio AP vs AD (barras) e um ranking anual de custos por curso. | Administrador | ✔️ Concluído |


## ⏳ Funcionalidades por Fazer (Pendentes / Ideias Futuras)

| Funcionalidade | Descrição | Prioridade Sugerida |
| :--- | :--- | :--- |
| **Fecho e Bloqueio de Mês** | Funcionalidade para "Trancar" um mês já pago, bloqueando retroativamente as edições para garantir segurança no histórico financeiro. | Alta |
| **Workflow de Aprovação** | Sistema onde o Diretor "Submete" a folha e esta fica pendente de aprovação final pelo Administrador antes de gerar o relatório oficial. | Média |
| **Exportação Financeira para Excel (Formato Banco)** | Exportação da folha em formato `.xlsx` estruturado (com NUIT, Conta, e Valor) otimizado para carregamento direto nos sistemas dos bancos. | Alta |
| **Envio de Folhas por E-mail (Automatização)** | Geração automática do PDF do ofício e envio instantâneo por e-mail para os Recursos Humanos com apenas um clique. | Baixa |
| **Gestão de Substituições de Docentes** | Módulo que permite transferir automaticamente a carga horária e o valor financeiro de um docente que faltou para o seu substituto. | Média |
| **Tabela Salarial Dinâmica** | Substituir o valor fixo de 500 Mts/hora no código por uma configuração baseada na categoria académica ou escalão do docente na base de dados. | Alta |
| **Recuperação de Senha Segura (Esqueci-me)** | Sistema de recuperação de palavra-passe com envio de token temporário por e-mail, dispensando a intervenção forçada do Administrador. | Baixa |
