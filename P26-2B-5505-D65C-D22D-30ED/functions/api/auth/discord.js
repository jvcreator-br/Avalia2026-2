export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Variáveis de ambiente que configuraremos no Cloudflare
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const redirectUri = env.DISCORD_REDIRECT_URI;

  // PASSO 1: Iniciar login (Redirecionar para o Discord se não houver código)
  if (!code) {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
    return Response.redirect(discordAuthUrl, 302);
  }

  // PASSO 2: Receber o código e trocar pelo Access Token
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) return new Response("Falha na autorização", { status: 400 });

    // PASSO 3: Obter perfil do utilizador na API do Discord
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    // PASSO 4: Guardar ou atualizar utilizador na base de dados D1
    const userId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO users (id, discord_id, username, avatar) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET 
        username = excluded.username, 
        avatar = excluded.avatar
    `).bind(userId, userData.id, userData.username, userData.avatar).run();

    // PASSO 5: Criar cookie de sessão e redirecionar para a página principal
    const cookie = `session=${userData.id}; HttpOnly; Secure; Path=/; SameSite=Lax`;
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": cookie
      }
    });

  } catch (error) {
    return new Response("Erro interno do servidor: " + error.message, { status: 500 });
  }
}