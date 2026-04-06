// ── Spaced Repetition (Leitner Box System) ────────────────────────────────
import { getWordBank, saveWordBank } from './storage.js';

const BOX_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Backfill SRS fields on legacy word bank entries
export function initSRSFields() {
  const bank = getWordBank();
  let changed = false;
  const today = todayISO();
  for (const w of bank) {
    if (w.box === undefined) {
      w.box = 1;
      w.lastReview = null;
      w.nextDue = today;
      changed = true;
    }
  }
  if (changed) saveWordBank(bank);
}

// Get words due for review (nextDue <= today), sorted weakest first
export function getDueWords(limit = 20) {
  const bank = getWordBank();
  const today = todayISO();
  return bank
    .filter(w => (w.nextDue || today) <= today)
    .sort((a, b) => (a.box || 1) - (b.box || 1))
    .slice(0, limit);
}

export function getDueCount() {
  return getDueWords(999).length;
}

// Promote word: move to next box, set new review date
export function promoteWord(de) {
  const bank = getWordBank();
  const word = bank.find(w => w.de === de);
  if (!word) return;
  const today = todayISO();
  word.box = Math.min((word.box || 1) + 1, 5);
  word.lastReview = today;
  word.nextDue = addDays(today, BOX_INTERVALS[word.box]);
  saveWordBank(bank);
}

// Demote word: back to box 1, due tomorrow
export function demoteWord(de) {
  const bank = getWordBank();
  const word = bank.find(w => w.de === de);
  if (!word) return;
  const today = todayISO();
  word.box = 1;
  word.lastReview = today;
  word.nextDue = addDays(today, 1);
  saveWordBank(bank);
}

// Render the review deck into #lessonOutput
export function openReviewDeck() {
  const dueWords = getDueWords();
  const out = document.getElementById('lessonOutput');

  if (dueWords.length === 0) {
    out.innerHTML = `<div class="lesson-card" style="text-align:center;padding:40px 24px">
      <div style="font-size:2rem;margin-bottom:12px">✅</div>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:8px">All caught up!</div>
      <div style="color:var(--muted);font-size:0.9rem">No words due for review. Come back tomorrow.</div>
    </div>`;
    return;
  }

  let idx = 0;
  let promoted = 0;
  let demoted = 0;

  function renderCard() {
    if (idx >= dueWords.length) {
      showSummary();
      return;
    }
    const w = dueWords[idx];
    const dots = dueWords.map((_, i) => {
      let cls = 'exercise-dot';
      if (i < idx) cls += i < idx ? '' : '';
      if (i === idx) cls += ' active';
      return `<div class="${cls}" id="srs-dot-${i}"></div>`;
    }).join('');

    out.innerHTML = `<div class="lesson-card">
      <div class="section-label">Review Deck</div>
      <div class="exercise-header">
        <span class="exercise-counter">${idx + 1} / ${dueWords.length}</span>
        <div class="exercise-dots">${dots}</div>
      </div>
      <div class="flashcard">
        <div class="flashcard-box">Box ${w.box || 1}</div>
        <div class="flashcard-word">${w.de}</div>
        ${w.note ? `<div class="flashcard-note">${w.note}</div>` : ''}
        <div id="srsReveal" style="display:none">
          <div class="flashcard-answer">${w.en}</div>
        </div>
        <div id="srsActions">
          <button class="primary" id="srsRevealBtn" style="width:100%;padding:12px;margin-top:20px">Reveal Answer</button>
        </div>
      </div>
    </div>`;

    document.getElementById('srsRevealBtn').onclick = () => {
      document.getElementById('srsReveal').style.display = 'block';
      document.getElementById('srsActions').innerHTML = `
        <div class="srs-buttons">
          <button class="srs-btn srs-miss" id="srsMiss">✗ Missed</button>
          <button class="srs-btn srs-got" id="srsGot">✓ Got it</button>
        </div>`;
      document.getElementById('srsGot').onclick = () => {
        promoteWord(w.de);
        promoted++;
        const dot = document.getElementById(`srs-dot-${idx}`);
        if (dot) dot.className = 'exercise-dot done-correct';
        idx++;
        renderCard();
      };
      document.getElementById('srsMiss').onclick = () => {
        demoteWord(w.de);
        demoted++;
        const dot = document.getElementById(`srs-dot-${idx}`);
        if (dot) dot.className = 'exercise-dot done-wrong';
        idx++;
        renderCard();
      };
    };
  }

  function showSummary() {
    out.innerHTML = `<div class="lesson-card">
      <div class="score-card">
        <div class="score-big">🧠 ${promoted}/${dueWords.length}</div>
        <div class="score-label">
          ${promoted} remembered · ${demoted} need more practice
        </div>
        <div class="score-dots">
          ${dueWords.map((_, i) => {
            const color = i < promoted ? 'var(--green)' : 'var(--red)';
            return `<div class="score-dot" style="background:${color}"></div>`;
          }).join('')}
        </div>
        <button class="primary" onclick="generateLesson()" style="padding:10px 28px;margin-top:12px">Start a Lesson →</button>
      </div>
    </div>`;
    // Update due count badge
    updateDueBadge();
  }

  renderCard();
}

export function updateDueBadge() {
  const count = getDueCount();
  const el = document.getElementById('srsDueCount');
  if (!el) return;
  if (count > 0) {
    el.style.display = 'inline';
    el.textContent = count;
  } else {
    el.style.display = 'inline';
    el.textContent = '✓';
  }
}
