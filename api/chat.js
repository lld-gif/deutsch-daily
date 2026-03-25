export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1s, 2s, 4s

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(req.body),
      });

      // If overloaded or server error, retry
      if (response.status === 529 || (response.status >= 500 && response.status < 600)) {
        lastError = new Error(`Anthropic API ${response.status}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        const errorData = await response.text();
        return res.status(response.status).json({ error: `Anthropic API error ${response.status}`, detail: errorData });
      }

      // Rate limit — respect retry-after header
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
        lastError = new Error('Rate limited');
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }
        return res.status(429).json({ error: 'Rate limited — try again shortly' });
      }

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json(data);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return res.status(502).json({ error: 'Failed after retries', detail: lastError?.message });
}
