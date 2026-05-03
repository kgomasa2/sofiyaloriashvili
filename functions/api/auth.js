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
<html><body style="font-family:sans-serif;padding:24px;color:#333;">
<p id="status">Finalizing login…</p>
<script>
(function() {
  var status = document.getElementById('status');
  function log(msg) {
    console.log('[oauth-popup]', msg);
    if (status) status.textContent = msg;
  }
  function receiveMessage(e) {
    log('got message from opener: ' + JSON.stringify(e.data) + ' (origin: ' + e.origin + ')');
    if (e.data !== "authorizing:github") {
      log('ignoring unrelated message');
      return;
    }
    window.removeEventListener("message", receiveMessage, false);
    log('handshake matched, sending token to ' + e.origin);
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
  }
  if (!window.opener) {
    log('No window.opener — open this from the admin login button, not directly.');
    return;
  }
  window.addEventListener("message", receiveMessage, false);
  log('Listening, sending "authorizing:github" to opener…');
  window.opener.postMessage("authorizing:github", "*");
  // Safety net: close popup after 30s even if Decap forgets to.
  setTimeout(function () {
    try { window.close(); } catch (e) {}
  }, 30000);
})();
</script></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
