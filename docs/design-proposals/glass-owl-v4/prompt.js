// A local, illustrative prompt for exploring the external-AI entry in the prototype.
(() => {
  'use strict';
  const prompt = `Organize o planejamento anexado em um curso Moodle.

Regras:
1. Use somente informações presentes no planejamento e nas orientações que eu fornecer.
2. Preserve a ordem dos tópicos e todas as atividades mencionadas. Um tópico pode ter várias tarefas, quizzes ou fóruns.
3. Não invente datas, notas, respostas corretas ou atividades. Se faltar uma informação, registre-a em pendingQuestions.
4. Use o trecho do documento que eu indicar como início da leitura. Se não houver indicação, considere o documento inteiro.
5. Relacione arquivos de apoio por seus nomes quando o planejamento informar a atividade correspondente. Se a associação não estiver clara, registre uma pergunta.
6. Retorne somente JSON válido, sem blocos de Markdown, seguindo o formato ilustrativo abaixo. O conteúdo do exemplo deve ser substituído pelo planejamento.

{
  "title": "Nome do curso",
  "sections": [
    {
      "title": "Nome do tópico",
      "activities": [
        {
          "title": "Título da atividade",
          "type": "page",
          "content": "Conteúdo extraído do planejamento"
        }
      ]
    }
  ],
  "pendingQuestions": []
}

O exemplo serve para organizar a resposta. Identifique o tipo de cada atividade conforme o planejamento e mantenha seu conteúdo específico.`;
  const dialog = document.getElementById('prompt-dialog');
  const text = document.getElementById('prompt-text');
  const error = document.getElementById('prompt-copy-error');
  const status = document.getElementById('prompt-status');
  let trigger;
  text.value = prompt;

  async function copy() {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(prompt); return true; }
      catch { /* Let the user copy the visible text if the browser blocks clipboard access. */ }
    }
    return false;
  }
  function announceCopied() {
    status.textContent = 'Prompt de exemplo copiado. Use-o com seu planejamento em outra IA e depois importe o JSON.';
  }
  function showPrompt() {
    error.hidden = false;
    dialog.showModal();
    text.focus();
    text.select();
  }
  for (const button of document.querySelectorAll('[data-copy-prompt]')) {
    button.addEventListener('click', async () => {
      trigger = button;
      button.disabled = true;
      let copied = false;
      try {
        copied = await copy();
        if (copied) {
          announceCopied();
        } else showPrompt();
      } finally { button.disabled = false; }
      if (copied) button.focus();
    });
  }
  document.getElementById('copy-prompt-text').addEventListener('click', async () => {
    if (await copy()) {
      announceCopied();
      dialog.close();
    } else {
      error.hidden = false;
      text.focus();
      text.select();
    }
  });
  document.getElementById('close-prompt').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger?.focus());
})();
