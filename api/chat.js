export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
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
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

Commit → Vercel redeploys → app works.

---

**The ELI5 of what this actually does:**
```
BEFORE (broken):
Browser → Anthropic API ✗ (CORS blocked — Anthropic says "who are you?")

AFTER (working):
Browser → /api/chat (your own Vercel server) → Anthropic API ✓
         (same origin, CORS fine)    (server-to-server, no CORS)
