# Deutsch Daily

A daily German lesson generator powered by Claude. Generates structured B1–B2 lessons with grammar, vocabulary, example sentences, and interactive exercises tailored to a specific learner profile.

## Structure

```
deutsch-daily/
├── api/
│   └── chat.js            # Vercel serverless proxy to Anthropic API
├── public/
│   ├── config/
│   │   ├── prompts.js      # Learner profile, exercise types, prompt builders
│   │   └── settings.js     # Model name, API URL, max tokens, topic map
│   ├── index.html          # UI, rendering logic, state management
│   └── style.css           # All styles
├── vercel.json             # Routing and function config
└── README.md
```

## Updating Prompts

Edit `public/config/prompts.js` to change:

- **LEARNER_PROFILE** — learner background, priority gaps, strengths
- **EXERCISE_TYPES** — exercise format instructions for the model
- **buildPrompt()** — lesson generation prompt template
- **buildReviewPrompt()** — weekly review prompt template

## Updating Settings

Edit `public/config/settings.js` to change:

- **MODEL** — Claude model identifier
- **API_URL** — API endpoint path
- **MAX_TOKENS** — response token limit
- **TOPIC_MAP** — available topic categories and their descriptions

## Deploy

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Set environment variable: `ANTHROPIC_API_KEY`
4. Deploy — Vercel routes `public/` as static files and `api/` as serverless functions
