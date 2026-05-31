export default function handler(req, res) {
  const { host } = req.headers;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${baseUrl}/api/callback`,
    scope: 'repo',
    state: Math.random().toString(36).substring(7)
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
