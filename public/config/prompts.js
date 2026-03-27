import { TOPIC_MAP } from './settings.js';

export const LEARNER_PROFILE = `
LEARNER PROFILE (from diagnostic):
- Son named Walter attends Kita (German preschool). ~20% vocab must be Kita-relevant.
- Level: A2/B1 border. Good subordinate clause instinct, strong Kita vocab.
- PRIORITY GAPS (address these, rotate through):
  1. Konjunktiv II — writes "wurde" instead of "wuerde". Drill wuerde/haette/waere.
  2. Seit + Praesens — defaults to English perfect. Drill "Er geht seit X Monaten in die Kita."
  3. Chained dass-clauses — verb-final breaks in linked clauses.
  4. Two-way prepositions + case switch (Akk motion vs Dat location).
  5. Fixed verb+preposition pairs (sich erinnern an, warten auf, etc.)
  6. 3rd person conjugation (er putzt not er putze).
  7. Noun capitalisation and gender.
- STRENGTHS (scaffold on, don't re-drill): subordinate clause word order, Kita vocab, Perfekt tense.`;

export const EXERCISE_TYPES = `
Exercise types — use ONLY these two (mix roughly 60/40):
- "multiple_choice": A German sentence with ___ gap. Provide 4 options A-D. answer is index 0-3.
  - Wrong options MUST mirror the learner's documented error patterns (e.g. wurde vs wuerde, wrong case after two-way preposition, dropped preposition, wrong conjugation).
  - explanation field: always explain WHY each wrong option is wrong, not just why the right one is right.
  - translation field: ALWAYS include an English translation of the complete sentence (with the correct answer filled in).
- "fill_in": A German sentence with ___ gap. correct_answer is the exact word(s) expected.
  - explanation field: explain why this answer is correct AND what a learner might wrongly write instead and why that's wrong.
  - translation field: ALWAYS include an English translation of the complete sentence (with the correct answer filled in).

CRITICAL: Every exercise must have a rich explanation field that teaches — not just confirms the answer.
CRITICAL: Every exercise must have a translation field with the full English translation.`;

export function buildPrompt(topic, difficulty, todayHistory, { exerciseCount = 10, missedExercises = [], grammarHistory = [], sentenceThemes = [] } = {}) {
  const missedSection = missedExercises.length > 0
    ? `\nPREVIOUSLY MISSED EXERCISES — recycle 1-2 of these (rephrase slightly, same grammar point):\n${missedExercises.map(m => `- Q: "${m.question}" → Correct: "${m.correct_answer}" (${m.type})`).join('\n')}\n`
    : '';

  const grammarSection = grammarHistory.length > 0
    ? `\nGRAMMAR POINTS USED IN LAST 14 DAYS — do NOT repeat any of these:\n${grammarHistory.map(g => `- ${g.title} (${g.date})`).join('\n')}\nChoose a grammar point NOT on this list.\n`
    : '';

  const sentenceSection = sentenceThemes.length > 0
    ? `\nSENTENCE THEMES USED RECENTLY — vary from these:\n${sentenceThemes.join(', ')}\n`
    : '';

  const targetExercises = exerciseCount === 20
    ? `exercises: exactly 20 items, mix of multiple_choice and fill_in ONLY. First 14 target today's grammar. Last 6 cross-test previous gaps.`
    : `exercises: exactly 10 items, mix of multiple_choice and fill_in ONLY. First 7 target today's grammar. Last 3 cross-test previous gaps.`;

  const targetExerciseSlots = exerciseCount === 20
    ? `For exercises 1-14: target today's grammar point primarily.\nFor exercises 15-20: cross-test previous gaps from the priority list (rotate — no two lessons test the same gap in slots 15-20).`
    : `For exercises 1-7: target today's grammar point primarily.\nFor exercises 8-10: cross-test previous gaps from the priority list (rotate — no two lessons test the same gap in slots 8-10).`;

  return `You are a German language tutor. Generate a structured 25-minute daily lesson for an adult learner targeting ${difficulty} proficiency.
${LEARNER_PROFILE}
Topic focus: ${TOPIC_MAP[topic] || TOPIC_MAP.auto}

ALREADY USED TODAY — DO NOT REPEAT these grammar points or themes:
${(() => { const h = todayHistory; const parts = []; if (h.grammar.length) parts.push('Grammar points used: ' + h.grammar.join(', ')); if (h.themes.length) parts.push('Themes used: ' + h.themes.join(', ')); return parts.length ? parts.join('. ') + '. Choose something clearly different.' : 'Nothing used yet — choose freely.'; })()}
${grammarSection}${missedSection}${sentenceSection}
${EXERCISE_TYPES}
${targetExerciseSlots}

Return ONLY valid JSON (no markdown, no preamble):
{
  "level": "${difficulty}",
  "theme": "short theme title in English",
  "grammar": {
    "title": "grammar point name",
    "explanation": "2-3 sentence explanation",
    "formula": "key pattern as short string",
    "tip": "one practical tip referencing a learner error"
  },
  "vocab": [
    { "de": "word", "en": "translation", "note": "gender/usage or null", "kita": true, "conjugation": { "ich": "...", "du": "...", "er/sie/es": "...", "wir": "...", "ihr": "...", "sie/Sie": "..." } }
  ],
  "sentences": [
    { "de": "German sentence", "en": "English translation", "explanation": "why this structure works / grammar note" }
  ],
  "exercises": [
    {
      "type": "multiple_choice",
      "prompt": "instruction",
      "question": "sentence with ___",
      "options": ["A","B","C","D"],
      "answer": 0,
      "explanation": "why correct, name the error pattern avoided",
      "translation": "full English translation of the sentence with correct answer"
    }
  ]
}
Rules:
- vocab: exactly 5 items, 1-2 kita:true. If the word is a VERB, include a "conjugation" object with keys: ich, du, er/sie/es, wir, ihr, sie/Sie (present tense). For non-verbs, OMIT the conjugation field entirely.
- sentences: exactly 3, at least 1 usable with Walter. Each sentence MUST have an "explanation" field (1-2 sentences) explaining the grammar or usage pattern demonstrated.
- ${targetExercises}
- fill_in exercises use: { "type":"fill_in", "prompt":"...", "question":"sentence with ___", "correct_answer":"exact word(s)", "explanation":"why correct + what a wrong answer looks like and why it fails", "translation":"English translation of the full sentence" }
- multiple_choice explanation MUST explain why each wrong option is wrong, referencing the learner's documented error patterns
- Wrong MC options must mirror: wurde/wuerde confusion, wrong case after two-way prepositions, dropped prepositions, wrong 3rd-person conjugation
- Every exercise MUST include a "translation" field with the full English translation of the sentence (with the correct answer filled in)`;
}

export function buildReviewPrompt(difficulty, { exerciseCount = 10 } = {}) {
  const targetExercises = exerciseCount === 20
    ? `exercises: exactly 20, mix of multiple_choice and fill_in only, each targeting a different gap from the priority list (cycle through gaps twice)`
    : `exercises: exactly 10, mix of multiple_choice and fill_in only, each targeting a different gap from the priority list`;

  return `You are a German language tutor. Generate a 25-minute WEEKLY REVIEW for an adult learner at ${difficulty} targeting B1-B2.
${LEARNER_PROFILE}
${EXERCISE_TYPES}

This is a review — no new grammar. Cross-test ALL priority gaps across the ${exerciseCount} exercises.

Return ONLY valid JSON (no markdown, no preamble):
{
  "level": "${difficulty}",
  "theme": "Weekly Review – Gap Check",
  "grammar": {
    "title": "Weekly Review",
    "explanation": "No new material. This session tests all your documented gaps.",
    "formula": "wuerde/haette/waere | seit + Praesens | Akk (wohin?) vs Dat (wo?)",
    "tip": "Watch for wurde vs wuerde — one dot, completely different meaning."
  },
  "vocab": [
    { "de": "word", "en": "translation", "note": "review reminder", "kita": false }
  ],
  "sentences": [
    { "de": "sentence with deliberate error", "en": "what it should mean (spot the error)", "explanation": "what the error is and the correct form" },
    { "de": "correct seit + Praesens with Walter", "en": "translation", "explanation": "grammar note" },
    { "de": "correct Konjunktiv II daily-life sentence", "en": "translation", "explanation": "grammar note" }
  ],
  "exercises": [
    {
      "type": "multiple_choice",
      "prompt": "...",
      "question": "...",
      "options": ["A","B","C","D"],
      "answer": 0,
      "explanation": "...",
      "translation": "full English translation of the sentence with correct answer"
    }
  ]
}
Rules:
- vocab: exactly 5 items, 1-2 kita:true. If the word is a VERB, include a "conjugation" object. For non-verbs, omit it.
- sentences: exactly 3; sentences[0] must contain a deliberate error. Each sentence MUST have an "explanation" field.
- ${targetExercises}
- fill_in uses: { "type":"fill_in", "prompt":"...", "question":"...", "correct_answer":"...", "explanation":"...", "translation":"..." }
- Every explanation must explain why wrong answers are wrong, not just confirm the right one
- Every exercise MUST include a "translation" field`;
}
