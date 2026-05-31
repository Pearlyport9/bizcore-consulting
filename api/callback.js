export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage(
            'authorization:github:error:{"message":"No code provided"}',
            '*'
          );
        }
        window.close();
      </script></body></html>
    `);
  }
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
        code: code
      })
    });
    const data = await response.json();
    if (data.error) {
      return res.status(401).send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage(
              'authorization:github:error:${JSON.stringify({message: data.error_description || data.error})}',
              '*'
            );
          }
          window.close();
        </script></body></html>
      `);
    }
    const token = data.access_token;
    return res.status(200).send(`
      <html><body><script>
        const token = '${token}';
        const message = 'authorization:github:success:' + JSON.stringify({
          token: token,
          provider: 'github'
        });
        if (window.opener) {
          window.opener.postMessage(message, '*');
        }
        window.close();
      </script></body></html>
    `);
  } catch (err) {
    return res.status(500).send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage(
            'authorization:github:error:${JSON.stringify({message: err.message})}',
            '*'
          );
        }
        window.close();
      </script></body></html>
    `);
  }
}
