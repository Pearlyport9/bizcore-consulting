export default async function handler(req, res) {
  const { code } = req.query;
  const { host } = req.headers;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/api/callback`
      })
    });
    const data = await response.json();
    if (data.error) {
      res.status(401).send(`
        <script>
          window.opener.postMessage(
            'authorization:github:error:${data.error}',
            '*'
          );
        </script>
      `);
      return;
    }
    res.send(`
      <script>
        window.opener.postMessage(
          'authorization:github:success:${JSON.stringify({ 
            token: data.access_token, 
            provider: 'github' 
          })}',
          '*'
        );
        window.close();
      </script>
    `);
  } catch (err) {
    res.status(500).send(`
      <script>
        window.opener.postMessage(
          'authorization:github:error:${err.message}',
          '*'
        );
      </script>
    `);
  }
}
