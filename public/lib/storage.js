// ── Storage Module ─────────────────────────────────────────────────────────
// Namespaced localStorage helpers for multi-user support.
// All keys follow the pattern: de_<userId>_<keyName>

const LEGACY_KEYS = [
  'word_bank', 'lesson_state', 'today_history', 'score_history',
  'missed_exercises', 'grammar_all', 'sentence_themes'
];

// ── Namespace helpers ────────────────────────────────────────────────────

export function getActiveUser() {
  return localStorage.getItem('de_active_user') || 'default';
}

export function setActiveUser(id) {
  localStorage.setItem('de_active_user', id);
}

function storageKey(name) {
  return `de_${getActiveUser()}_${name}`;
}

function getJSON(name, fallback) {
  try {
    const raw = localStorage.getItem(storageKey(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setJSON(name, value) {
  try { localStorage.setItem(storageKey(name), JSON.stringify(value)); } catch {}
}

export function listUsers() {
  const users = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const match = key.match(/^de_(.+?)_lesson_state$/);
    if (match) users.add(match[1]);
  }
  return [...users];
}

// ── Migration ────────────────────────────────────────────────────────────

export function migrateGlobalKeys() {
  if (localStorage.getItem('de_migrated') === '1') return;

  // Check if any old-format keys exist
  const hasLegacy = LEGACY_KEYS.some(k => localStorage.getItem(`de_${k}`) !== null);
  if (!hasLegacy) {
    localStorage.setItem('de_migrated', '1');
    return;
  }

  // Copy old keys to default user namespace
  for (const k of LEGACY_KEYS) {
    const oldKey = `de_${k}`;
    const newKey = `de_default_${k}`;
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
  }

  localStorage.setItem('de_active_user', 'default');
  localStorage.setItem('de_migrated', '1');
}

// ── State (streak / progress) ────────────────────────────────────────────

export function getState() {
  return getJSON('lesson_state', { streak: 0, lastDate: null, dayCount: 0 });
}

export function saveState(s) {
  setJSON('lesson_state', s);
}

// ── Today history ────────────────────────────────────────────────────────

export function getTodayHistory() {
  const today = new Date().toDateString();
  const data = getJSON('today_history', {});
  if (data.date !== today) return { date: today, themes: [], grammar: [] };
  return data;
}

export function addToHistory(theme, grammarTitle) {
  try {
    const h = getTodayHistory();
    if (theme && !h.themes.includes(theme)) h.themes.push(theme);
    if (grammarTitle && !h.grammar.includes(grammarTitle)) h.grammar.push(grammarTitle);
    setJSON('today_history', h);
  } catch {}
}

// ── Missed exercises ─────────────────────────────────────────────────────

export function getMissedExercises() {
  return getJSON('missed_exercises', []);
}

export function addMissedExercise(ex) {
  try {
    const missed = getMissedExercises();
    missed.push({
      question: ex.question,
      correct_answer: ex.correct_answer || ex.options?.[ex.answer] || '',
      type: ex.type,
      explanation: ex.explanation,
      date: new Date().toDateString()
    });
    while (missed.length > 20) missed.shift();
    setJSON('missed_exercises', missed);
  } catch {}
}

// ── Grammar history (14-day window) ──────────────────────────────────────

export function getGrammarHistory() {
  const data = getJSON('grammar_all', []);
  const cutoff = Date.now() - 14 * 86400000;
  return data.filter(g => new Date(g.date).getTime() > cutoff);
}

export function addGrammarHistory(title) {
  try {
    const data = getGrammarHistory();
    if (!data.some(g => g.title === title)) {
      data.push({ title, date: new Date().toDateString() });
    }
    setJSON('grammar_all', data);
  } catch {}
}

// ── Sentence themes (3-day window) ───────────────────────────────────────

export function getSentenceThemes() {
  const data = getJSON('sentence_themes', []);
  const cutoff = Date.now() - 3 * 86400000;
  return data.filter(s => new Date(s.date).getTime() > cutoff).map(s => s.theme);
}

export function addSentenceThemes(sentences) {
  try {
    const data = getJSON('sentence_themes', []);
    const today = new Date().toDateString();
    for (const s of sentences) {
      const theme = s.de.substring(0, 40);
      data.push({ theme, date: today });
    }
    while (data.length > 15) data.shift();
    setJSON('sentence_themes', data);
  } catch {}
}

// ── Score history (90-entry cap) ─────────────────────────────────────────

export function getScoreHistory() {
  return getJSON('score_history', []);
}

export function saveScoreHistory(lesson, score, total, pct) {
  try {
    const history = getScoreHistory();
    history.push({
      date: new Date().toISOString(),
      theme: lesson.theme,
      grammar: lesson.grammar?.title || '',
      score, total, pct
    });
    while (history.length > 90) history.shift();
    setJSON('score_history', history);
  } catch {}
}

// ── Word bank ────────────────────────────────────────────────────────────

export function getWordBank() {
  return getJSON('word_bank', []);
}

export function saveWordBank(bank) {
  setJSON('word_bank', bank);
}

export function addToWordBank(vocabItems) {
  try {
    const bank = getWordBank();
    const existing = new Set(bank.map(w => w.de.toLowerCase()));
    const today = new Date().toDateString();
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const v of vocabItems) {
      if (!existing.has(v.de.toLowerCase())) {
        bank.push({
          de: v.de, en: v.en, note: v.note || '', kita: !!v.kita, date: today,
          box: 1, lastReview: null, nextDue: todayISO
        });
        existing.add(v.de.toLowerCase());
      }
    }
    saveWordBank(bank);
    updateWordBankCount();
  } catch {}
}

export function updateWordBankCount() {
  const count = getWordBank().length;
  const el = document.getElementById('wbCount');
  if (!el) return;
  if (count > 0) { el.style.display = 'inline'; el.textContent = count; }
  else { el.style.display = 'none'; }
}

// ── Weak grammar topics (for adaptive difficulty) ────────────────────────

export function getWeakGrammarTopics(limit = 3) {
  const history = getScoreHistory();
  const grammarMap = {};
  for (const h of history) {
    if (!h.grammar) continue;
    if (!grammarMap[h.grammar]) grammarMap[h.grammar] = [];
    grammarMap[h.grammar].push(h.pct);
  }
  return Object.entries(grammarMap)
    .map(([grammar, scores]) => ({
      grammar,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit);
}
