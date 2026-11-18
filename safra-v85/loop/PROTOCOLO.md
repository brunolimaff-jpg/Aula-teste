# Loop de auto melhoramento — Um Dia de Safra

Papéis
- Orquestrador (Opus): escolhe tarefas pequenas, revisa o diff, aceita ou rejeita. Único que mexe em /home/claude/s6f/src.
- Executor (Haiku): faz UMA tarefa numa cópia isolada /home/claude/loop/<tarefa>/src e roda o portão.
- Auditor (Haiku): lê screenshots do portão e o código, propõe a próxima rodada (só propõe).

Regras do executor
1. Edite só os arquivos citados na tarefa, dentro da SUA pasta. Nunca toque em vendor__three-bundle.js, _pre.js ou em /home/claude/s6f.
2. Mudanças mínimas e localizadas. Nada de reformatar arquivo, renomear ou reescrever blocos que funcionam.
3. Textos em PT-BR, frases curtas, humor leve e corporativo, sem emoji. Marca Senior: verde, laranja nas ações, azul-escuro no texto.
4. Rode o portão: `node /home/claude/s6f/loop/gate.mjs /home/claude/loop/<tarefa>` (leva ~2 min). Precisa sair "ok": true.
5. Se falhar, corrija e rode de novo (máx. 3 tentativas). Se não passar, desfaça e reporte.
6. Relatório final curto: o que mudou (arquivo + função), resultado do portão, riscos. Sem colar código.

Critério de aceite do orquestrador
- Portão verde (desktop, 10 paradas, andar, demo até a ligação, mobile, zero erro JS).
- Diff pequeno e legível; sem regressão visual nos screenshots dist/gate_*.png.
- Nada que contrarie o histórico do handoff (resposta no meio, postes na pista, caminhão parando etc.).
