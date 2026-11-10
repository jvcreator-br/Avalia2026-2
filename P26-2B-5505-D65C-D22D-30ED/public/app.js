// public/app.js

/**
 * 1. Interpretador Markdown (Regex)
 * Converte texto Markdown básico em HTML.
 */
function parseMarkdown(markdownText) {
    if (!markdownText) return "";

    let html = markdownText;

    // Cabeçalhos (H1, H2, H3)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Negrito e Itálico
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Links: [Texto](URL)
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Listas não ordenadas (hífen)
    html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
    // Junta listas adjacentes para evitar múltiplos <ul> soltos
    html = html.replace(/<\/ul>\n<ul>/gim, ''); 

    // Quebras de linha (convertidas para <br>)
    html = html.replace(/\n/gim, '<br>');

    return html.trim();
}

/**
 * 2. Inicialização da Aplicação
 * Executa assim que o documento HTML carrega.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const appContainer = document.getElementById("app");
    if (!appContainer) return;

    try {
        // Verifica se o usuário está logado usando a rota que criamos
        const response = await fetch("/api/status");
        const data = await response.json();

        if (data.authenticated) {
            // Interface do usuário logado (Editor em tempo real)
            appContainer.innerHTML = `
                <header class="app-header">
                    <h2>Meu Bloco de Notas</h2>
                    <div class="user-profile">
                        <img src="https://cdn.discordapp.com/avatars/${data.user.discord_id}/${data.user.avatar}.png" alt="Avatar" width="40" style="border-radius: 50%;">
                        <span>${data.user.username}</span>
                    </div>
                </header>
                <main class="editor-container">
                    <div class="input-pane">
                        <h3>Markdown</h3>
                        <textarea id="md-input" placeholder="Escreva seu Markdown aqui... (Ex: # Título)"></textarea>
                    </div>
                    <div class="preview-pane">
                        <h3>Visualização</h3>
                        <div id="md-preview" class="preview-box"></div>
                    </div>
                </main>
            `;

            // Evento para atualizar a visualização em tempo real enquanto o usuário digita
            const mdInput = document.getElementById("md-input");
            const mdPreview = document.getElementById("md-preview");

            mdInput.addEventListener("input", (e) => {
                mdPreview.innerHTML = parseMarkdown(e.target.value);
            });

        } else {
            // Interface de login
            appContainer.innerHTML = `
                <div class="login-container">
                    <h1>Bloco de Notas Markdown</h1>
                    <p>Faça login para salvar suas anotações com tags.</p>
                    <a href="/api/auth/discord" class="btn-login">Entrar com Discord</a>
                </div>
            `;
        }
    } catch (error) {
        console.error("Erro ao carregar o status da aplicação:", error);
        appContainer.innerHTML = `<p>Erro ao carregar o aplicativo. Verifique sua conexão.</p>`;
    }
});