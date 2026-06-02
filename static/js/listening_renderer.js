/* ═══════════════════════════════════════════════════════════
   listening_renderer.js
   IELTS Listening Test — Student Player
   Steps 3.4 – 3.8 of Phase 3
   ═══════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
const LT = {
  test:           null,   // full test object from API
  slug:           null,
  activePart:     1,      // 1-4
  answers:        {},     // { "1": "Kings", "11": ["B","C"] }
  startTime:      null,
  timerInterval:  null,
  timeLimit:      30,     // minutes
  submitted:      false,
  _results:       null,   // per-question results after submit
  _transcripts:   null,   // {"1": "Part 1 transcript text", ...}
};

/* ── Helpers ─────────────────────────────────────────────── */
function _esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function _fmt(seconds) {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function _qRangeForPart(partNum) {
  const part = (LT.test?.data?.parts || []).find(p => p.part_number === partNum);
  if (!part) return '';
  const nums = [];
  for (const g of (part.question_groups || [])) {
    for (const q of (g.questions || [])) nums.push(q.number);
  }
  if (!nums.length) return '';
  nums.sort((a, b) => a - b);
  return `Q${nums[0]}–${nums[nums.length - 1]}`;
}

function _allQuestionNumbers() {
  const nums = [];
  for (const part of (LT.test?.data?.parts || [])) {
    for (const g of (part.question_groups || [])) {
      for (const q of (g.questions || [])) nums.push(q.number);
    }
  }
  return nums.sort((a, b) => a - b);
}

/* ═══════════════════════════════════════════════════════════
   STEP 3.4 — Boot: fetch test from API
   ═══════════════════════════════════════════════════════════ */
window.initListeningTest = async function (slug) {
  const section = document.getElementById('listeningTestSection');
  if (!section) return;

  // Show section (spinner)
  section.classList.add('lt-active');
  document.getElementById('lt-questions-panel').innerHTML =
    '<div style="padding:48px;text-align:center;color:var(--text-muted)">Loading test…</div>';

  LT.slug      = slug;
  LT.answers   = {};
  LT.submitted = false;
  LT.activePart = 1;

  try {
    const res  = await fetch(`/api/listening/tests/${slug}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Not found');

    LT.test      = data.test;
    LT.timeLimit = data.test.time_limit || 30;
    LT.startTime = Date.now();

    document.getElementById('lt-test-title').textContent = LT.test.title;

    _renderPartTabs();
    _renderActivePart();
    _renderPalette();
    _startTimer();

  } catch (err) {
    document.getElementById('lt-questions-panel').innerHTML =
      `<div style="padding:48px;text-align:center;color:#dc2626">Failed to load test: ${_esc(err.message)}</div>`;
  }
};

/* ═══════════════════════════════════════════════════════════
   STEP 3.5 — Part tabs + Audio player
   ═══════════════════════════════════════════════════════════ */
function _renderPartTabs() {
  const bar = document.getElementById('lt-part-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const parts = LT.test?.data?.parts || [];
  parts.forEach(part => {
    const btn = document.createElement('button');
    btn.className   = 'lt-part-tab' + (part.part_number === LT.activePart ? ' active' : '');
    btn.dataset.part = part.part_number;
    const range     = _qRangeForPart(part.part_number);
    btn.innerHTML   = `Part ${part.part_number}<span class="lt-q-range">${range ? '(' + range + ')' : ''}</span>`;
    btn.addEventListener('click', () => _switchPart(part.part_number));
    bar.appendChild(btn);
  });
}

function _switchPart(partNum) {
  LT.activePart = partNum;
  // Update tab active state
  document.querySelectorAll('.lt-part-tab').forEach(t => {
    t.classList.toggle('active', Number(t.dataset.part) === partNum);
  });
  _renderActivePart();
  // Scroll to top of questions panel
  const panel = document.getElementById('lt-questions-panel');
  if (panel) panel.scrollTop = 0;
}

function _renderActivePart() {
  const panel = document.getElementById('lt-questions-panel');
  if (!panel) return;
  panel.innerHTML = '';

  const parts = LT.test?.data?.parts || [];
  const part  = parts.find(p => p.part_number === LT.activePart);
  if (!part) {
    panel.innerHTML = '<div style="padding:32px;color:var(--text-muted)">No questions for this part yet.</div>';
    return;
  }

  // ── Audio bar ─────────────────────────────────────────────
  const audioBar = document.createElement('div');
  audioBar.className = 'lt-audio-bar';

  const partBadge = document.createElement('span');
  partBadge.className = 'lt-part-label';
  partBadge.textContent = `Part ${part.part_number}`;
  audioBar.appendChild(partBadge);

  if (part.audio_url) {
    const audio   = document.createElement('audio');
    audio.controls = true;
    audio.src      = part.audio_url;
    audio.preload  = 'metadata';
    audioBar.appendChild(audio);
  } else {
    const noAudio = document.createElement('span');
    noAudio.style.cssText = 'font-size:.8rem;color:var(--text-muted)';
    noAudio.textContent   = 'No audio uploaded for this part.';
    audioBar.appendChild(noAudio);
  }

  panel.appendChild(audioBar);

  // ── Question groups ───────────────────────────────────────
  for (const group of (part.question_groups || [])) {
    const groupEl = _renderGroup(group);
    if (groupEl) panel.appendChild(groupEl);
  }
}

/* ═══════════════════════════════════════════════════════════
   STEP 3.6 — Render all question types
   ═══════════════════════════════════════════════════════════ */
function _renderGroup(group) {
  const wrap = document.createElement('div');
  wrap.className = 'lt-group';
  wrap.dataset.groupId = group.group_id;

  // Instructions
  if (group.instructions) {
    const instr    = document.createElement('p');
    instr.className = 'lt-group-instructions';
    instr.textContent = group.instructions;
    wrap.appendChild(instr);
  }

  // Constraint tag
  if (group.constraint) {
    const ct    = document.createElement('span');
    ct.className = 'lt-group-constraint';
    ct.textContent = group.constraint;
    wrap.appendChild(ct);
  }

  // Route to type renderer
  const completionTypes = ['form_completion', 'note_completion', 'sentence_completion'];
  if (completionTypes.includes(group.type)) {
    wrap.appendChild(_renderCompletion(group));
  } else if (group.type === 'mcq_multiple') {
    wrap.appendChild(_renderMcqMultiple(group));
  } else if (group.type === 'mcq_single') {
    wrap.appendChild(_renderMcqSingle(group));
  } else if (group.type === 'map_labelling') {
    wrap.appendChild(_renderMapLabelling(group));
  } else if (group.type === 'matching_information') {
    wrap.appendChild(_renderMatchingInfo(group));
  } else {
    // Fallback: show questions as text inputs
    wrap.appendChild(_renderFallbackTextInputs(group));
  }

  return wrap;
}

/* ── Completion types (form / note / sentence) ─────────── */
function _renderCompletion(group) {
  const frag = document.createDocumentFragment();

  if (group.context_html) {
    const ctx = document.createElement('div');
    ctx.className = 'lt-context';

    // Replace [[N]] markers with labeled input fields
    let html = group.context_html;
    html = html.replace(/\[\[(\d+)\]\]/g, (_, n) => {
      return `<span class="lt-blank">
        <span class="lt-blank-num">${n}</span>
        <input class="lt-text-input" data-q="${n}"
               placeholder="Q${n}"
               autocomplete="off"
               value="${_esc(String(LT.answers[n] || ''))}">
      </span>`;
    });
    ctx.innerHTML = html;

    // Attach change listeners
    ctx.querySelectorAll('.lt-text-input[data-q]').forEach(inp => {
      inp.addEventListener('input', () => {
        const qNum = inp.dataset.q;
        LT.answers[qNum] = inp.value.trim();
        inp.classList.toggle('answered', !!inp.value.trim());
        _updatePaletteBubble(qNum);
        _updateProgress();
      });
      // Mark pre-filled (edit session)
      if (inp.value) inp.classList.add('answered');
    });

    frag.appendChild(ctx);
  } else {
    // No context_html — fall back to plain text inputs per question
    frag.appendChild(_renderFallbackTextInputs(group));
  }

  return frag;
}

/* ── MCQ Multiple (Choose TWO/THREE) ───────────────────── */
function _renderMcqMultiple(group) {
  const frag = document.createDocumentFragment();

  for (const q of (group.questions || [])) {
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '20px';

    // Question stem row
    const stemRow = document.createElement('div');
    stemRow.className = 'lt-q-row';
    stemRow.style.marginBottom = '10px';
    stemRow.innerHTML = `
      <div class="lt-q-num">${q.number}</div>
      <div class="lt-q-stem">${_esc(q.text || '')}</div>`;
    qWrap.appendChild(stemRow);

    // Limit notice
    const limit = group.limit || 2;
    const notice = document.createElement('div');
    notice.className = 'lt-mcq-limit';
    notice.textContent = `Choose ${limit} letter${limit > 1 ? 's' : ''}`;
    qWrap.appendChild(notice);

    // Options
    const optList = document.createElement('div');
    optList.className = 'lt-mcq-options';

    (q.options || []).forEach(opt => {
      const label = document.createElement('label');
      label.className = 'lt-mcq-option';

      const currentAnswers = Array.isArray(LT.answers[q.number])
        ? LT.answers[q.number]
        : [];
      const checked = currentAnswers.includes(opt.letter);

      label.innerHTML = `
        <input type="checkbox" value="${_esc(opt.letter)}" ${checked ? 'checked' : ''}>
        <span class="lt-opt-letter">${_esc(opt.letter)}</span>
        <span class="lt-opt-text">${_esc(opt.text)}</span>`;

      if (checked) label.classList.add('selected');

      const cb = label.querySelector('input');
      cb.addEventListener('change', () => {
        // Collect all checked in this question group
        const allCbs = optList.querySelectorAll('input[type="checkbox"]');
        const selected = Array.from(allCbs).filter(c => c.checked).map(c => c.value);

        // Enforce limit
        if (selected.length > limit) {
          cb.checked = false;
          return;
        }

        LT.answers[q.number] = selected;
        optList.querySelectorAll('.lt-mcq-option').forEach(l => {
          l.classList.toggle('selected', l.querySelector('input').checked);
        });
        _updatePaletteBubble(q.number);
        _updateProgress();
      });

      optList.appendChild(label);
    });

    qWrap.appendChild(optList);
    frag.appendChild(qWrap);
  }

  return frag;
}

/* ── MCQ Single (Choose ONE) ────────────────────────────── */
function _renderMcqSingle(group) {
  const frag = document.createDocumentFragment();

  for (const q of (group.questions || [])) {
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '20px';

    const stemRow = document.createElement('div');
    stemRow.className = 'lt-q-row';
    stemRow.style.marginBottom = '10px';
    stemRow.innerHTML = `
      <div class="lt-q-num">${q.number}</div>
      <div class="lt-q-stem">${_esc(q.text || '')}</div>`;
    qWrap.appendChild(stemRow);

    const optList = document.createElement('div');
    optList.className = 'lt-mcq-options';
    const groupName = `mcq_single_${q.number}`;

    (q.options || []).forEach(opt => {
      const label = document.createElement('label');
      label.className = 'lt-mcq-option';

      const current = LT.answers[q.number] || '';
      const checked  = current === opt.letter;
      label.innerHTML = `
        <input type="radio" name="${groupName}" value="${_esc(opt.letter)}" ${checked ? 'checked' : ''}>
        <span class="lt-opt-letter">${_esc(opt.letter)}</span>
        <span class="lt-opt-text">${_esc(opt.text)}</span>`;

      if (checked) label.classList.add('selected');

      const rb = label.querySelector('input');
      rb.addEventListener('change', () => {
        LT.answers[q.number] = rb.value;
        optList.querySelectorAll('.lt-mcq-option').forEach(l => {
          l.classList.toggle('selected', l.querySelector('input').checked);
        });
        _updatePaletteBubble(q.number);
        _updateProgress();
      });

      optList.appendChild(label);
    });

    qWrap.appendChild(optList);
    frag.appendChild(qWrap);
  }

  return frag;
}

/* ── Map Labelling ──────────────────────────────────────── */
function _renderMapLabelling(group) {
  const wrap = document.createElement('div');
  wrap.className = 'lt-map-wrap';

  // Map image
  if (group.image_url) {
    const img = document.createElement('img');
    img.src       = group.image_url;
    img.className = 'lt-map-img';
    img.alt       = 'Map / Plan';
    wrap.appendChild(img);
  }

  const selects = document.createElement('div');
  selects.className = 'lt-map-selects';

  for (const q of (group.questions || [])) {
    const row = document.createElement('div');
    row.className = 'lt-map-row';

    const numEl = document.createElement('div');
    numEl.className = 'lt-q-num';
    numEl.textContent = q.number;
    row.appendChild(numEl);

    const stem = document.createElement('span');
    stem.className = 'lt-q-stem';
    stem.textContent = q.text || '';
    row.appendChild(stem);

    const sel = document.createElement('select');
    sel.className = 'lt-map-select';
    sel.dataset.q  = q.number;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— pick —';
    sel.appendChild(placeholder);

    // Letters A–I
    const letters = ['A','B','C','D','E','F','G','H','I'];
    letters.forEach(l => {
      const opt  = document.createElement('option');
      opt.value  = l;
      opt.textContent = l;
      if (String(LT.answers[q.number] || '') === l) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      LT.answers[q.number] = sel.value;
      _updatePaletteBubble(q.number);
      _updateProgress();
    });

    row.appendChild(sel);
    selects.appendChild(row);
  }

  wrap.appendChild(selects);
  return wrap;
}

/* ── Matching Information ───────────────────────────────── */
function _renderMatchingInfo(group) {
  const wrap = document.createElement('div');
  wrap.className = 'lt-mi-rows';

  // Show option pool legend
  if ((group.option_pool || []).length) {
    const legend = document.createElement('div');
    legend.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:10px;line-height:1.7';
    legend.innerHTML = (group.option_pool || [])
      .map(o => `<strong>${_esc(o.letter)}</strong>${o.text ? ' — ' + _esc(o.text) : ''}`)
      .join(' &nbsp;|&nbsp; ');
    wrap.appendChild(legend);
  }

  for (const q of (group.questions || [])) {
    const row = document.createElement('div');
    row.className = 'lt-mi-row';

    const numEl = document.createElement('div');
    numEl.className = 'lt-q-num';
    numEl.textContent = q.number;
    row.appendChild(numEl);

    const sel = document.createElement('select');
    sel.className = 'lt-mi-select';
    sel.dataset.q = q.number;

    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = '—';
    sel.appendChild(ph);

    (group.option_pool || []).forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.letter;
      opt.textContent = o.text ? `${o.letter} — ${o.text}` : o.letter;
      if (String(LT.answers[q.number] || '') === o.letter) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      LT.answers[q.number] = sel.value;
      _updatePaletteBubble(q.number);
      _updateProgress();
    });

    row.appendChild(sel);

    const stem = document.createElement('span');
    stem.className = 'lt-mi-stem';
    stem.textContent = q.text || '';
    row.appendChild(stem);

    wrap.appendChild(row);
  }

  return wrap;
}

/* ── Fallback: plain text inputs (for unknown types) ──── */
function _renderFallbackTextInputs(group) {
  const frag = document.createDocumentFragment();

  for (const q of (group.questions || [])) {
    const row = document.createElement('div');
    row.className = 'lt-q-row';
    row.style.marginBottom = '10px';

    const numEl = document.createElement('div');
    numEl.className = 'lt-q-num';
    numEl.textContent = q.number;
    row.appendChild(numEl);

    if (q.text) {
      const stem = document.createElement('span');
      stem.className = 'lt-q-stem';
      stem.textContent = q.text;
      row.appendChild(stem);
    }

    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'lt-text-input';
    inp.dataset.q   = q.number;
    inp.placeholder = `Answer ${q.number}`;
    inp.value       = String(LT.answers[q.number] || '');
    inp.autocomplete = 'off';
    if (inp.value) inp.classList.add('answered');

    inp.addEventListener('input', () => {
      LT.answers[q.number] = inp.value.trim();
      inp.classList.toggle('answered', !!inp.value.trim());
      _updatePaletteBubble(q.number);
      _updateProgress();
    });

    row.appendChild(inp);
    frag.appendChild(row);
  }

  return frag;
}

/* ═══════════════════════════════════════════════════════════
   STEP 3.7 — Answer Palette + Navigation
   ═══════════════════════════════════════════════════════════ */
function _renderPalette() {
  const palette = document.getElementById('lt-palette');
  if (!palette) return;
  palette.innerHTML = '';

  const nums = _allQuestionNumbers();
  nums.forEach(n => {
    const bub = document.createElement('div');
    bub.className   = 'lt-bubble';
    bub.id          = `lt-bub-${n}`;
    bub.textContent = n;

    const ans = LT.answers[n];
    const filled = Array.isArray(ans) ? ans.length > 0 : !!ans;
    if (filled) bub.classList.add('answered');

    bub.addEventListener('click', () => _scrollToQuestion(n));
    palette.appendChild(bub);
  });

  _updateProgress();
}

function _updatePaletteBubble(qNum) {
  const bub = document.getElementById(`lt-bub-${qNum}`);
  if (!bub) return;
  const ans    = LT.answers[qNum];
  const filled = Array.isArray(ans) ? ans.length > 0 : !!ans;
  bub.classList.toggle('answered', filled);
  _updateProgress();
}

function _updateProgress() {
  const total    = _allQuestionNumbers().length;
  const answered = _allQuestionNumbers().filter(n => {
    const ans = LT.answers[n];
    return Array.isArray(ans) ? ans.length > 0 : !!ans;
  }).length;

  const bar   = document.getElementById('lt-progress-bar');
  const label = document.getElementById('lt-progress-label');
  const pct   = total > 0 ? Math.round((answered / total) * 100) : 0;

  if (bar)   bar.style.width = `${pct}%`;
  if (label) label.textContent = `${answered} / ${total} answered`;
}

function _scrollToQuestion(qNum) {
  // Switch to the part containing this question first
  const parts = (LT.test?.data?.parts || []);
  for (const part of parts) {
    for (const group of (part.question_groups || [])) {
      const found = (group.questions || []).some(q => String(q.number) === String(qNum));
      if (found && part.part_number !== LT.activePart) {
        _switchPart(part.part_number);
        // Wait for render, then scroll
        setTimeout(() => _doScrollToQuestion(qNum), 80);
        return;
      }
    }
  }
  _doScrollToQuestion(qNum);
}

function _doScrollToQuestion(qNum) {
  // Scroll the input into view
  const inp = document.querySelector(`[data-q="${qNum}"]`);
  if (inp) {
    inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inp.focus();
  }
}

/* ── Timer ───────────────────────────────────────────────── */
function _startTimer() {
  const el = document.getElementById('lt-timer');
  if (LT.timerInterval) clearInterval(LT.timerInterval);

  LT.timerInterval = setInterval(() => {
    if (LT.submitted) { clearInterval(LT.timerInterval); return; }
    const elapsed = Math.floor((Date.now() - LT.startTime) / 1000);
    const remaining = (LT.timeLimit * 60) - elapsed;
    if (el) {
      el.textContent = _fmt(Math.max(remaining, 0));
      el.classList.toggle('warning', remaining < 120);
    }
    if (remaining <= 0 && !LT.submitted) {
      clearInterval(LT.timerInterval);
      _autoSubmit();
    }
  }, 1000);
}

function _autoSubmit() {
  if (LT.submitted) return;
  alert('Time is up! Your answers have been submitted automatically.');
  _doSubmit();
}

/* ═══════════════════════════════════════════════════════════
   STEP 3.8 — Submit + Score Popup
   ═══════════════════════════════════════════════════════════ */
window.submitListeningTest = async function () {
  if (LT.submitted) return;

  const total   = _allQuestionNumbers().length;
  const answered = _allQuestionNumbers().filter(n => {
    const a = LT.answers[n];
    return Array.isArray(a) ? a.length > 0 : !!a;
  }).length;

  const unanswered = total - answered;
  if (unanswered > 0) {
    if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
  } else {
    if (!confirm('Submit your answers? This cannot be undone.')) return;
  }

  _doSubmit();
};

async function _doSubmit() {
  if (LT.submitted) return;
  LT.submitted = true;
  clearInterval(LT.timerInterval);

  const timeTaken = Math.floor((Date.now() - LT.startTime) / 1000);

  // Normalise answers to strings for API
  const payload = {};
  for (const [k, v] of Object.entries(LT.answers)) {
    payload[k] = v;
  }

  try {
    const res  = await fetch(`/api/listening/tests/${LT.slug}/submit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ answers: payload, time_taken: timeTaken }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Submit failed');

    // Store transcripts for Phase 4 review
    LT._transcripts = data.transcripts || {};

    _showScoreModal(data);
  } catch (err) {
    alert('Submission failed: ' + err.message);
    LT.submitted = false;
  }
}

function _showScoreModal(result) {
  const overlay = document.getElementById('lt-score-overlay');
  if (!overlay) return;

  const total = result.total || 40;
  const score = result.score || 0;
  const band  = result.band_score || 0;
  const pct   = Math.round((score / total) * 100);

  // Score ring progress
  const ring = overlay.querySelector('.lt-score-ring');
  if (ring) ring.style.setProperty('--pct', `${pct}%`);

  const numEl = overlay.querySelector('.lt-score-num');
  if (numEl) numEl.textContent = score;

  const denomEl = overlay.querySelector('.lt-score-denom');
  if (denomEl) denomEl.textContent = `/ ${total}`;

  const bandEl = overlay.querySelector('.lt-band-val');
  if (bandEl) bandEl.textContent = band.toFixed(1);

  const pctEl = overlay.querySelector('.lt-pct-val');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const timeEl = overlay.querySelector('.lt-time-val');
  if (timeEl) {
    const t = result.time_taken || 0;
    timeEl.textContent = `${Math.floor(t/60)}m ${t%60}s`;
  }

  overlay.classList.add('open');

  // Store results for review
  LT._results = result.results || [];
}

window.exitListeningTest = function () {
  _cleanupListeningTest();
  // Close score modal if open
  const overlay = document.getElementById('lt-score-overlay');
  if (overlay) overlay.classList.remove('open');
  // Go back to listening hub
  const section = document.getElementById('listeningTestSection');
  if (section) section.classList.remove('lt-active');
  if (window.showSection) window.showSection('listening');
};

window.reviewListeningAnswers = function () {
  const overlay = document.getElementById('lt-score-overlay');
  if (overlay) overlay.classList.remove('open');
  _enterReviewMode();
};

/* ═══════════════════════════════════════════════════════════
   PHASE 4 — Post-Submit Split-Panel Review
   ═══════════════════════════════════════════════════════════ */

/**
 * Switch the player layout from exam mode → review mode.
 * Exam:   [questions-panel]  [sidebar]
 * Review: [transcript-panel] [resize-handle] [review-list]
 *
 * We reuse #lt-questions-panel and #lt-sidebar DOM slots.
 */
function _enterReviewMode() {
  if (!LT._results) return;

  // ── Switch questions panel → transcript panel ───────────
  const qPanel = document.getElementById('lt-questions-panel');
  if (qPanel) {
    qPanel.className = 'lt-transcript-panel';
    qPanel.innerHTML = '';
    _renderTranscriptPanel(qPanel);
    // Make room for the fixed review panel on the right
    qPanel.style.marginRight = '360px';
  }

  // ── Hide bottom nav (not needed in review) ───────────────
  const bottomNav = document.querySelector('.lt-bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';

  // ── Inject right-side review panel ──────────────────────
  const section = document.getElementById('listeningTestSection');
  if (!section) return;

  const oldWrap = document.getElementById('lt-review-panel-wrap');
  if (oldWrap) oldWrap.remove();

  const reviewWrap = document.createElement('div');
  reviewWrap.id = 'lt-review-panel-wrap';
  reviewWrap.className = 'lt-review-list';
  reviewWrap.style.cssText = [
    'position:fixed', 'top:60px', 'right:0', 'bottom:0', 'width:360px',
    'z-index:200', 'display:flex', 'flex-direction:column',
    'box-shadow:-4px 0 20px rgba(0,0,0,.12)',
  ].join(';');

  // Stats header
  const correctCount = LT._results.filter(r => r.is_correct).length;
  const wrongCount   = LT._results.length - correctCount;

  const reviewHdr = document.createElement('div');
  reviewHdr.className = 'lt-review-header';
  reviewHdr.innerHTML = `
    <span>Answer Review</span>
    <div class="lt-review-header-stats">
      <span class="lt-review-stat correct">✓ ${correctCount}</span>
      <span class="lt-review-stat wrong">✗ ${wrongCount}</span>
    </div>`;
  reviewWrap.appendChild(reviewHdr);

  const items = document.createElement('div');
  items.className = 'lt-review-items';
  items.style.cssText = 'overflow-y:auto;flex:1;background:var(--bg-main,#f1f5f9);padding:10px';
  reviewWrap.appendChild(items);

  LT._results.forEach(r => _renderReviewCard(r, items));

  // Exit row at the bottom
  const exitRow = document.createElement('div');
  exitRow.style.cssText = 'padding:12px 16px;background:var(--bg-card,#fff);border-top:1px solid var(--border,#e2e8f0);display:flex;gap:8px';
  exitRow.innerHTML = `
    <button onclick="exitListeningTest()" style="flex:1;padding:9px;border-radius:9px;border:1px solid var(--border,#e2e8f0);background:transparent;font-size:.85rem;font-weight:600;cursor:pointer;color:var(--text,#1e293b)">
      Exit Test
    </button>`;
  reviewWrap.appendChild(exitRow);

  section.appendChild(reviewWrap);

  // Recolour palette bubbles
  _updatePaletteForReview();
}


/* ── Palette: recolour bubbles after review ───────────────── */
function _updatePaletteForReview() {
  if (!LT._results) return;
  LT._results.forEach(r => {
    const bub = document.getElementById(`lt-bub-${r.number}`);
    if (!bub) return;
    bub.classList.remove('answered');
    bub.classList.add(r.is_correct ? 'review-correct' : 'review-wrong');
    // Add inline colour since we haven't added extra CSS classes for palette yet
    bub.style.background = r.is_correct ? '#10b981' : '#dc2626';
    bub.style.borderColor = r.is_correct ? '#10b981' : '#dc2626';
    bub.style.color = '#fff';
  });
}

/* ── Transcript panel renderer ────────────────────────────── */
function _renderTranscriptPanel(container) {
  const parts = (LT.test?.data?.parts || []);
  const hasTranscripts = LT._transcripts && Object.keys(LT._transcripts).length > 0;

  if (!hasTranscripts) {
    container.innerHTML = `
      <div class="lt-no-transcript">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
        No transcript available for this test.<br>
        <small>Ask your admin to add transcripts to unlock this feature.</small>
      </div>`;
    return;
  }

  // Build a map: answer_location text → [list of question numbers]
  const locationMap = {};   // locationText → [qNum, ...]
  (LT._results || []).forEach(r => {
    if (r.answer_location) {
      const key = r.answer_location.trim();
      if (!locationMap[key]) locationMap[key] = [];
      locationMap[key].push(r.number);
    }
  });

  // Render one block per part
  parts.forEach(part => {
    const partKey = String(part.part_number);
    const transcript = (LT._transcripts || {})[partKey];
    if (!transcript) return;

    const block = document.createElement('div');
    block.dataset.partBlock = partKey;

    const partHdr = document.createElement('div');
    partHdr.className = 'lt-transcript-part-header';
    partHdr.textContent = `Part ${part.part_number} — Transcript`;
    block.appendChild(partHdr);

    const bodyEl = document.createElement('div');
    bodyEl.className  = 'lt-transcript-body';
    bodyEl.id         = `lt-transcript-part-${partKey}`;
    bodyEl.innerHTML  = _buildTranscriptHtml(transcript, locationMap);
    block.appendChild(bodyEl);

    container.appendChild(block);
  });
}

/**
 * Build the transcript HTML, wrapping every `answer_location` string
 * in a highlighted span with numbered badges.
 *
 * locationMap: { "the answer is Kings": [1], ... }
 */
function _buildTranscriptHtml(rawText, locationMap) {
  // Escape the whole text first
  let escaped = _esc(rawText);

  // Sort by length descending so longer matches take priority
  const entries = Object.entries(locationMap)
    .sort((a, b) => b[0].length - a[0].length);

  entries.forEach(([loc, qNums]) => {
    if (!loc) return;
    const escapedLoc = _esc(loc);
    const badges = qNums
      .map(n => `<span class="lt-loc-badge">${n}</span>`)
      .join('');
    const replacement =
      `<mark class="lt-loc-highlight" data-loc="${_esc(loc)}" data-qnums="${qNums.join(',')}"` +
      ` onclick="scrollToReviewCard(${qNums[0]})" title="Q${qNums.join(', Q')}: ${_esc(loc)}">${badges}${escapedLoc}</mark>`;

    // Replace first occurrence in the escaped text
    escaped = escaped.replace(escapedLoc, replacement);
  });

  // Preserve line breaks
  return escaped.replace(/\n/g, '<br>');
}

/* ── Per-question review card ─────────────────────────────── */
function _renderReviewCard(r, container) {
  const cls  = r.is_correct ? 'correct' : 'wrong';
  const uAns = Array.isArray(r.user_answer)
    ? r.user_answer.join(', ')
    : String(r.user_answer || '—');
  const cAns = Array.isArray(r.correct_answer)
    ? r.correct_answer.join(', ')
    : String(r.correct_answer || '');

  const card = document.createElement('div');
  card.className = `lt-review-card ${cls}`;
  card.id        = `lt-review-card-${r.number}`;

  // Top row: bubble + answers
  const top = document.createElement('div');
  top.className = 'lt-review-card-top';

  const bubble = document.createElement('div');
  bubble.className = 'lt-review-qbubble';
  bubble.textContent = r.number;
  top.appendChild(bubble);

  const answers = document.createElement('div');
  answers.className = 'lt-review-card-answers';

  // Your answer
  const yourLbl = document.createElement('span');
  yourLbl.className = 'lt-review-ans-label';
  yourLbl.textContent = 'Your answer';
  answers.appendChild(yourLbl);

  const yourAns = document.createElement('span');
  yourAns.className = `lt-review-your-ans ${r.is_correct ? 'correct-ans' : 'wrong-ans'}`;
  yourAns.textContent = uAns || '(no answer)';
  answers.appendChild(yourAns);

  // Correct answer (only show if wrong)
  if (!r.is_correct) {
    const corrLbl = document.createElement('span');
    corrLbl.className = 'lt-review-ans-label';
    corrLbl.style.marginTop = '4px';
    corrLbl.textContent = 'Correct answer';
    answers.appendChild(corrLbl);

    const corrAns = document.createElement('span');
    corrAns.className = 'lt-review-correct-ans';
    corrAns.textContent = cAns;
    answers.appendChild(corrAns);
  }

  top.appendChild(answers);
  card.appendChild(top);

  // Action buttons row
  const hasExplain  = !!r.explanation;
  const hasLocation = !!r.answer_location;

  if (hasExplain || hasLocation) {
    const actions = document.createElement('div');
    actions.className = 'lt-review-card-actions';

    // ── Explain button ─────────────────────────────
    if (hasExplain) {
      const explainBtn = document.createElement('button');
      explainBtn.className = 'lt-review-btn';
      explainBtn.innerHTML = `💡 Explain`;

      const explainBody = document.createElement('div');
      explainBody.className = 'lt-explanation-body';
      explainBody.textContent = r.explanation;

      explainBtn.addEventListener('click', () => {
        const isOpen = explainBody.classList.toggle('open');
        explainBtn.classList.toggle('active', isOpen);
        explainBtn.innerHTML = isOpen ? `💡 Hide` : `💡 Explain`;
      });

      actions.appendChild(explainBtn);
      card.appendChild(actions);
      card.appendChild(explainBody);
    } else {
      card.appendChild(actions);
    }

    // ── Location button ────────────────────────────
    if (hasLocation) {
      const locBtn = document.createElement('button');
      locBtn.className = 'lt-review-btn';
      locBtn.innerHTML = `📍 Location`;
      locBtn.title     = r.answer_location;
      locBtn.addEventListener('click', () => _scrollToTranscriptLocation(r));
      // Add to actions (already appended)
      const actionsEl = card.querySelector('.lt-review-card-actions');
      if (actionsEl) actionsEl.appendChild(locBtn);
    }
  }

  container.appendChild(card);
}

/* ── Scroll transcript to a highlighted answer location ──── */
function _scrollToTranscriptLocation(r) {
  // Find the highlight mark in the transcript with matching data-loc
  const marks = document.querySelectorAll('.lt-loc-highlight');
  for (const mark of marks) {
    if (mark.dataset.loc && mark.dataset.loc.trim() === (r.answer_location || '').trim()) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      mark.style.background = 'rgba(245,158,11,.7)';
      setTimeout(() => { mark.style.background = ''; }, 1200);
      return;
    }
  }
}

/* Called from transcript highlight onclick */
window.scrollToReviewCard = function (qNum) {
  const card = document.getElementById(`lt-review-card-${qNum}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/* ── Drag-to-resize handle ────────────────────────────────── */
function _initResizeHandle(handle, body, leftPanel, rightPanel) {
  let startX, startLeftW;

  handle.addEventListener('mousedown', e => {
    startX      = e.clientX;
    startLeftW  = leftPanel.getBoundingClientRect().width;
    handle.classList.add('dragging');

    const onMove = ev => {
      const dx      = ev.clientX - startX;
      const bodyW   = body.getBoundingClientRect().width;
      const handle6 = 6;
      const newLeft = Math.min(
        Math.max(startLeftW + dx, 200),  // min 200px for transcript
        bodyW - handle6 - 240            // min 240px for review list
      );
      const newRight = bodyW - handle6 - newLeft;
      body.style.gridTemplateColumns = `${newLeft}px 6px ${newRight}px`;
    };

    const onUp = () => {
      handle.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
}


function _cleanupListeningTest() {
  clearInterval(LT.timerInterval);
  LT.test         = null;
  LT.slug         = null;
  LT.answers      = {};
  LT.submitted    = false;
  LT._results     = null;
  LT._transcripts = null;
  LT.activePart   = 1;

  const panel    = document.getElementById('lt-questions-panel');
  const partBar  = document.getElementById('lt-part-bar');
  const palette  = document.getElementById('lt-palette');
  const timer    = document.getElementById('lt-timer');
  const bottomNav = document.querySelector('.lt-bottom-nav');
  const reviewWrap = document.getElementById('lt-review-panel-wrap');
  const progressLabel = document.getElementById('lt-progress-label');

  if (panel) {
    panel.innerHTML = '';
    panel.className = 'lt-questions-panel';
    panel.removeAttribute('style');
  }
  if (partBar) partBar.innerHTML = '';
  if (palette) palette.innerHTML = '';
  if (timer)   timer.textContent = '00:00';
  if (bottomNav) bottomNav.style.display = '';
  if (reviewWrap) reviewWrap.remove();
  if (progressLabel) progressLabel.textContent = '0 / 0 answered';
}


/* ═══════════════════════════════════════════════════════════
   HUB — Load + render test listing
   ═══════════════════════════════════════════════════════════ */
window.loadListeningTests = async function (category = 'all') {
  const list    = document.getElementById('lh-grid');
  const loading = document.getElementById('lh-loading');
  const empty   = document.getElementById('lh-empty');
  if (!list) return;

  list.innerHTML   = '';
  list.style.display = 'none';
  if (loading) loading.style.display = 'block';
  if (empty)   empty.style.display   = 'none';

  try {
    const url = category === 'all'
      ? '/api/listening/tests'
      : `/api/listening/tests?category=${category}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (loading) loading.style.display = 'none';

    if (!data.success || !data.tests.length) {
      if (empty) empty.style.display = 'block';
      return;
    }

    data.tests.forEach(t => {
      const card = document.createElement('div');
      card.className = 'lh-card';
      card.innerHTML = `
        <div>
          <span class="lh-card-badge">${_esc(t.category)}</span>
        </div>
        <h3 class="lh-card-title">${_esc(t.title)}</h3>
        <div class="lh-card-meta">
          <span>🎧 ${t.total_questions || 40} questions</span>
          <span>⏱ ${t.time_limit || 30} min</span>
          ${t.source_book ? `<span>📖 ${_esc(t.source_book)}</span>` : ''}
        </div>
        <button class="lh-card-action" onclick="startListeningTest('${_esc(t.slug)}')">
          ▶ Start Test
        </button>`;
      list.appendChild(card);
    });

    list.style.display = 'grid';
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (empty) {
      empty.style.display  = 'block';
      empty.textContent    = 'Failed to load tests. Please refresh.';
    }
  }
};

window.startListeningTest = function (slug) {
  if (window.showSection) window.showSection('listening_test', true, slug);
};
