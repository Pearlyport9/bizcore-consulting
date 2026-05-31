export default function handler(req, res) {
  const { host } = req.headers;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_CLIENT_ID environment variable');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/callback`,
    scope: 'repo,user',
    state: Math.random().toString(36).substring(7)
  });
  return res.redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
}
