// public/app.js

/**
 * 1. Interpretador Markdown (Regex)
 */
function parseMarkdown(md) {
  if (!md) return "";
  let html = md;
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul>\n<ul>/gim, '');
  html = html.replace(/\n/gim, '<br>');
  return html.trim();
}

/**
 * 2. Inicialização da Aplicação
 */
document.addEventListener("DOMContentLoaded", async () => {
  const appContainer = document.getElementById("app");
  if (!appContainer) return;

  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    if (data.authenticated && data.user) {
      renderAuthenticatedApp(appContainer, data.user);
    } else {
      renderLoginApp(appContainer);
    }
  } catch (err) {
    console.error("Erro ao verificar autenticação:", err);
  }
});

/**
 * Tela para Usuário Deslogado
 */
function renderLoginApp(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h2>Autenticação Necessária</h2>
      <p>Faça login com sua conta do Discord para criar e gerenciar suas notas.</p>
      <a href="/api/auth/discord" class="btn-primary" style="display: inline-block; text-decoration: none; margin-top: 1rem;">Entrar com Discord</a>
    </div>
  `;
}

/**
 * Tela Principal (Editor + Lista de Notas)
 */
async function renderAuthenticatedApp(container, user) {
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.8rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <img src="${avatarUrl}" alt="Avatar" width="36" height="36" style="border-radius: 50%;">
        <strong>${escapeHtml(user.username)}</strong>
      </div>
      <small style="color: #64748b;">Sessão ativa</small>
    </div>

    <!-- Formulário de Criar Nota -->
    <div style="background: #ffffff; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 1.5rem;">
      <h3 style="margin-top:0;">Nova Nota</h3>
      <input type="text" id="note-title" placeholder="Título da nota (opcional)" style="width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;">
      
      <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
        <textarea id="note-content" rows="6" placeholder="Escreva em Markdown..." style="flex: 1; min-width: 260px; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;"></textarea>
        <div id="note-preview" style="flex: 1; min-width: 260px; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; overflow-y: auto; max-height: 150px;"></div>
      </div>

      <input type="text" id="note-tags" placeholder="Tags (separadas por vírgula, ex: aula, js, d1)" style="width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;">
      <button id="btn-save-note" class="btn-primary" style="cursor: pointer;">Salvar Nota</button>
      <span id="save-status" style="margin-left: 0.5rem; font-size: 0.85rem; font-weight: 600;"></span>
    </div>

    <!-- Busca e Filtros -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
      <input type="text" id="search-input" placeholder="Buscar por palavra-chave..." style="flex: 1; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;">
      <input type="text" id="tag-filter-input" placeholder="Filtrar por tag..." style="width: 180px; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px;">
      <button id="btn-filter" class="btn-primary" style="cursor: pointer;">Filtrar</button>
    </div>

    <!-- Lista de Notas -->
    <h3 style="margin-bottom: 0.5rem;">Minhas Notas</h3>
    <div id="notes-list" style="display: flex; flex-direction: column; gap: 0.75rem;">Carregando notas...</div>
  `;

  const contentInput = document.getElementById("note-content");
  const previewDiv = document.getElementById("note-preview");
  const btnSave = document.getElementById("btn-save-note");
  const saveStatus = document.getElementById("save-status");
  const btnFilter = document.getElementById("btn-filter");

  // Visualização em tempo real (Live Preview)
  contentInput.addEventListener("input", (e) => {
    previewDiv.innerHTML = parseMarkdown(e.target.value);
  });

  // Salvar nota via API POST /api/notes
  btnSave.addEventListener("click", async () => {
    const title = document.getElementById("note-title").value.trim();
    const content = contentInput.value.trim();
    const tagsRaw = document.getElementById("note-tags").value.trim();
    const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()) : [];

    if (!content) {
      saveStatus.style.color = "#dc2626";
      saveStatus.textContent = "Digite algum conteúdo para salvar!";
      return;
    }

    saveStatus.style.color = "#2563eb";
    saveStatus.textContent = "Salvando...";

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags })
      });

      if (res.ok) {
        saveStatus.style.color = "#166534";
        saveStatus.textContent = "Nota salva com sucesso!";
        document.getElementById("note-title").value = "";
        contentInput.value = "";
        previewDiv.innerHTML = "";
        document.getElementById("note-tags").value = "";
        loadNotes();
      } else {
        const errData = await res.json();
        saveStatus.style.color = "#dc2626";
        saveStatus.textContent = errData.error || "Erro ao salvar nota.";
      }
    } catch (err) {
      saveStatus.style.color = "#dc2626";
      saveStatus.textContent = "Erro de conexão.";
    }
  });

  // Filtrar notas
  btnFilter.addEventListener("click", () => loadNotes());

  // Tornar a função deleteNote global para o botão funcionar no HTML inserido
  window.deleteNote = async (id) => {
    if (!confirm("Tem certeza que deseja apagar esta nota?")) return;
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadNotes();
      } else {
        alert("Erro ao apagar a nota.");
      }
    } catch (err) {
      alert("Erro de conexão ao apagar nota.");
    }
  };

  // Carregar lista de notas
  loadNotes();
}

/**
 * Busca notas na API GET /api/notes
 */
async function loadNotes() {
  const notesList = document.getElementById("notes-list");
  if (!notesList) return;

  const search = document.getElementById("search-input")?.value.trim() || "";
  const tag = document.getElementById("tag-filter-input")?.value.trim() || "";

  try {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (tag) params.append("tag", tag);

    const res = await fetch(`/api/notes?${params.toString()}`);
    if (!res.ok) {
      notesList.innerHTML = `<p style="color: #dc2626;">Erro ao carregar as notas.</p>`;
      return;
    }

    const data = await res.json();
    const notes = data.notes || [];

    if (notes.length === 0) {
      notesList.innerHTML = `<p style="color: #64748b;">Nenhuma nota encontrada.</p>`;
      return;
    }

    notesList.innerHTML = notes.map(note => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">${escapeHtml(note.title)}</h4>
          <button onclick="deleteNote('${note.id}')" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.75rem;">Excluir</button>
        </div>
        <div style="font-size: 0.9rem; color: #334155; margin-bottom: 0.5rem;">
          ${parseMarkdown(note.content)}
        </div>
        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
          ${(note.tags || []).map(t => `<span style="background: #e2e8f0; color: #475569; font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 12px;">#${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
    `).join("");

  } catch (err) {
    notesList.innerHTML = `<p style="color: #dc2626;">Erro de rede ao carregar notas.</p>`;
  }
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}