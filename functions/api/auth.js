/**
 * Cloudflare Pages Function: /api/auth
 * OAuth proxy for Decap CMS ↔ GitHub
 *
 * Required environment variables (set in Cloudflare Pages dashboard):
 *   GITHUB_CLIENT_ID      — from your GitHub OAuth App
 *   GITHUB_CLIENT_SECRET  — from your GitHub OAuth App
 */

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  /* ── Step 1: No code yet → redirect to GitHub login ── */
  if (!code) {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      scope: 'repo,user',
      redirect_uri: `https://www.adultxoma.com/api/auth`,
    });
    return Response.redirect(`${GITHUB_AUTH_URL}?${params}`, 302);
  }

  /* ── Step 2: Exchange code for access token ── */
  let tokenData;
  try {
    const resp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `https://www.adultxoma.com/api/auth`,
      }),
    });
    tokenData = await resp.json();
  } catch (err) {
    return new Response('OAuth server error', { status: 500 });
  }

  /* — Step 3: Post result back to Decap CMS opener window — */
  const message = tokenData.error || !tokenData.access_token
    ? `authorization:github:error:${JSON.stringify({ error: tokenData.error_description || 'OAuth failed' })}`
    : `authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}`;

  const html = `<!doctype html>
<html><body><script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
