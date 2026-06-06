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
    _startListeningTimer();

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
    btn.addEventListener('click', () => _ltSwitchPart(part.part_number));
    bar.appendChild(btn);
  });
}

function _ltSwitchPart(partNum) {
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
  } else if (group.type === 'drag_drop_matching') {
    wrap.appendChild(_renderDragDropMatching(group));
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
      if (LT.submitted) {
        label.style.pointerEvents = 'none';
      }

      const currentAnswers = Array.isArray(LT.answers[q.number])
        ? LT.answers[q.number]
        : [];
      const checked = currentAnswers.includes(opt.letter);

      label.innerHTML = `
        <input type="checkbox" value="${_esc(opt.letter)}" ${checked ? 'checked' : ''} ${LT.submitted ? 'disabled' : ''}>
        <span class="lt-opt-letter">${_esc(opt.letter)}</span>
        <span class="lt-opt-text">${_esc(opt.text)}</span>`;

      if (checked) label.classList.add('selected');

      if (!LT.submitted) {
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
      }

      optList.appendChild(label);
    });

    qWrap.appendChild(optList);
    _applyReviewDecoration(q.number, stemRow, qWrap);
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
      if (LT.submitted) {
        label.style.pointerEvents = 'none';
      }

      const current = LT.answers[q.number] || '';
      const checked  = current === opt.letter;
      label.innerHTML = `
        <input type="radio" name="${groupName}" value="${_esc(opt.letter)}" ${checked ? 'checked' : ''} ${LT.submitted ? 'disabled' : ''}>
        <span class="lt-opt-letter">${_esc(opt.letter)}</span>
        <span class="lt-opt-text">${_esc(opt.text)}</span>`;

      if (checked) label.classList.add('selected');

      if (!LT.submitted) {
        const rb = label.querySelector('input');
        rb.addEventListener('change', () => {
          LT.answers[q.number] = rb.value;
          optList.querySelectorAll('.lt-mcq-option').forEach(l => {
            l.classList.toggle('selected', l.querySelector('input').checked);
          });
          _updatePaletteBubble(q.number);
          _updateProgress();
        });
      }

      optList.appendChild(label);
    });

    qWrap.appendChild(optList);
    _applyReviewDecoration(q.number, stemRow, qWrap);
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
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '12px';
    qWrap.style.width = '100%';

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
    if (LT.submitted) sel.disabled = true;

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

    if (!LT.submitted) {
      sel.addEventListener('change', () => {
        LT.answers[q.number] = sel.value;
        _updatePaletteBubble(q.number);
        _updateProgress();
      });
    }

    row.appendChild(sel);
    qWrap.appendChild(row);

    _applyReviewDecoration(q.number, row, qWrap);
    selects.appendChild(qWrap);
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
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '12px';
    qWrap.style.width = '100%';

    const row = document.createElement('div');
    row.className = 'lt-mi-row';

    const numEl = document.createElement('div');
    numEl.className = 'lt-q-num';
    numEl.textContent = q.number;
    row.appendChild(numEl);

    const sel = document.createElement('select');
    sel.className = 'lt-mi-select';
    sel.dataset.q = q.number;
    if (LT.submitted) sel.disabled = true;

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

    if (!LT.submitted) {
      sel.addEventListener('change', () => {
        LT.answers[q.number] = sel.value;
        _updatePaletteBubble(q.number);
        _updateProgress();
      });
    }

    row.appendChild(sel);

    const stem = document.createElement('span');
    stem.className = 'lt-mi-stem';
    stem.textContent = q.text || '';
    row.appendChild(stem);

    qWrap.appendChild(row);

    _applyReviewDecoration(q.number, row, qWrap);
    wrap.appendChild(qWrap);
  }

  return wrap;
}

/* ── Drag & Drop Matching ───────────────────────────────── */
function _renderDragDropMatching(group) {
  const pool     = group.option_pool || [];
  const qs       = (group.questions || []).slice().sort((a, b) => a.number - b.number);
  const allowReuse = group.allow_reuse || false;

  // Outer 2-col grid wrapper
  const wrap = document.createElement('div');
  wrap.className = 'lt-ddm-wrap';

  /* ── LEFT: drop zones ─────────────────────────────────── */
  const leftCol = document.createElement('div');
  leftCol.className = 'lt-ddm-left';

  qs.forEach(q => {
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '14px';
    qWrap.style.width = '100%';

    const row = document.createElement('div');
    row.className = 'lt-ddm-row';
    if (LT.submitted) {
      row.classList.add('lt-review-mode');
    }

    // Bullet + label
    const label = document.createElement('div');
    label.className = 'lt-ddm-label';
    label.textContent = `• ${q.text || ''}`;
    row.appendChild(label);

    // Number badge
    const num = document.createElement('div');
    num.className = 'lt-q-num';
    num.textContent = q.number;
    row.appendChild(num);

    // Drop zone
    const zone = document.createElement('div');
    zone.className  = 'lt-drop-zone';
    zone.dataset.q  = q.number;

    const existingLetter = String(LT.answers[q.number] || '');
    if (existingLetter) {
      const poolItem = pool.find(o => o.letter === existingLetter);
      let text = poolItem ? `${poolItem.letter}. ${poolItem.text}` : existingLetter;
      
      const r = (LT.submitted && LT._resultsMap) ? LT._resultsMap[q.number] : null;
      if (r) {
        text = (r.is_correct ? '✓ ' : '✕ ') + text;
      }
      zone.textContent = text;
      zone.classList.add('filled');
      if (r) {
        zone.classList.add(r.is_correct ? 'correct' : 'wrong');
      }
    } else {
      zone.textContent = 'Drop answer here';
    }

    if (!LT.submitted) {
      // dragover
      zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

      // drop
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const letter = e.dataTransfer.getData('text/plain');
        if (!letter) return;

        const poolItem = pool.find(o => o.letter === letter);
        if (!poolItem) return;

        // If zone already filled, return old letter to the pool first
        const oldLetter = String(LT.answers[q.number] || '');
        if (oldLetter && !allowReuse) {
          const oldEl = wrap.querySelector(`.lt-drag-option[data-letter="${oldLetter}"]`);
          if (oldEl) oldEl.classList.remove('used');
        }

        zone.textContent = `${poolItem.letter}. ${poolItem.text}`;
        zone.classList.add('filled');
        LT.answers[q.number] = letter;
        _updatePaletteBubble(q.number);
        _updateProgress();

        // Grey out used option
        if (!allowReuse) {
          const optEl = wrap.querySelector(`.lt-drag-option[data-letter="${letter}"]`);
          if (optEl) optEl.classList.add('used');
        }
      });

      // Click to clear a filled zone
      zone.addEventListener('click', () => {
        const letter = String(LT.answers[q.number] || '');
        if (!letter) return;

        // Return letter to pool
        if (!allowReuse) {
          const optEl = wrap.querySelector(`.lt-drag-option[data-letter="${letter}"]`);
          if (optEl) optEl.classList.remove('used');
        }

        zone.textContent = 'Drop answer here';
        zone.classList.remove('filled');
        LT.answers[q.number] = '';
        _updatePaletteBubble(q.number);
        _updateProgress();
      });
    } else {
      zone.style.cursor = 'default';
      zone.style.pointerEvents = 'none';
    }

    row.appendChild(zone);
    qWrap.appendChild(row);

    _applyReviewDecoration(q.number, row, qWrap);
    leftCol.appendChild(qWrap);
  });

  wrap.appendChild(leftCol);

  /* ── RIGHT: option pool ───────────────────────────────── */
  const rightCol = document.createElement('div');
  rightCol.className = 'lt-ddm-right';

  const hint = document.createElement('div');
  hint.className   = 'lt-ddm-right-hint';
  hint.textContent = 'Drag and drop an option to fill in each blank.';
  rightCol.appendChild(hint);

  // Compute which letters are already used (for pre-fill)
  const usedLetters = new Set(
    qs.map(q => String(LT.answers[q.number] || '')).filter(Boolean)
  );

  pool.forEach(o => {
    const optEl = document.createElement('div');
    optEl.className      = 'lt-drag-option';
    optEl.draggable      = true;
    optEl.dataset.letter = o.letter;

    const letterSpan = document.createElement('span');
    letterSpan.className   = 'lt-drag-option-letter';
    letterSpan.textContent = `${o.letter}.`;

    const textSpan = document.createElement('span');
    textSpan.textContent = o.text;

    optEl.appendChild(letterSpan);
    optEl.appendChild(textSpan);

    if (!allowReuse && usedLetters.has(o.letter)) {
      optEl.classList.add('used');
    }

    optEl.addEventListener('dragstart', e => {
      if (optEl.classList.contains('used')) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', o.letter);
      optEl.classList.add('dragging');
    });
    optEl.addEventListener('dragend', () => optEl.classList.remove('dragging'));

    rightCol.appendChild(optEl);
  });

  wrap.appendChild(rightCol);
  return wrap;
}

/* ── Fallback: plain text inputs (for unknown types) ──── */
function _renderFallbackTextInputs(group) {
  const frag = document.createDocumentFragment();

  for (const q of (group.questions || [])) {
    const qWrap = document.createElement('div');
    qWrap.style.marginBottom = '12px';
    qWrap.style.width = '100%';

    const row = document.createElement('div');
    row.className = 'lt-q-row';

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
    if (LT.submitted) inp.disabled = true;

    if (!LT.submitted) {
      inp.addEventListener('input', () => {
        LT.answers[q.number] = inp.value.trim();
        inp.classList.toggle('answered', !!inp.value.trim());
        _updatePaletteBubble(q.number);
        _updateProgress();
      });
    }

    row.appendChild(inp);
    qWrap.appendChild(row);

    _applyReviewDecoration(q.number, row, qWrap);
    frag.appendChild(qWrap);
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
        _ltSwitchPart(part.part_number);
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
function _startListeningTimer() {
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
  // Time's up — auto-submit silently (do not use alert() which blocks reading test)
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
  if (!window.confirm(unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
    : 'Submit your answers? This cannot be undone.')) return;

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
    console.error('Listening submission failed:', err.message);
    // Show error in the score overlay area instead of blocking alert
    const errEl = document.getElementById('lt-score-overlay');
    if (errEl) {
      // Briefly show an error inside the overlay section
    }
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
  LT._band    = result.band_score || 0;
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
 * Switch the player to review mode.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Header: Band Score | Answer stats | Exit              │
 *   ├──────────────────────┬─┬─────────────────────────────  │
 *   │  Transcript (left)   │▓│  Question review (right)      │
 *   │  (active part only)  │ │  (active part only)           │
 *   ├──────────────────────┴─┴─────────────────────────────  │
 *   │  Part 1 [bubbles] | Part 2 [bubbles] | Part 3 …       │  ← bottom nav
 *   └────────────────────────────────────────────────────────┘
 */
function _enterReviewMode() {
  if (!LT._results) return;

  const section = document.getElementById('listeningTestSection');
  if (!section) return;

  // Build result lookup: number → result object
  const resultMap = {};
  (LT._results || []).forEach(r => { resultMap[r.number] = r; });

  const parts = LT.test?.data?.parts || [];
  const totalCorrect = (LT._results || []).filter(r => r.is_correct).length;
  const totalWrong   = (LT._results || []).filter(r => !r.is_correct).length;

  // ── Build bottom nav HTML ──────────────────────────────────
  const partNavItems = parts.map(part => {
    const qs = (part.question_groups || []).flatMap(g => g.questions || []);
    const bubbles = qs.map(q => {
      const r = resultMap[q.number];
      const cls = r ? (r.is_correct ? 'correct' : 'wrong') : 'pending';
      return `<span class="lt-rnav-bubble ${cls}">${q.number}</span>`;
    }).join('');
    return `<button class="lt-rnav-part-btn" data-part="${part.part_number}">
      <span class="lt-rnav-part-label">Part ${part.part_number}: ${qs.length} questions</span>
      <span class="lt-rnav-bubbles">${bubbles}</span>
    </button>`;
  }).join('');

  // ── Replace entire section content with review layout ──────
  section.innerHTML = `
    <div class="lt-review-wrap" id="lt-review-wrap">

      <!-- Top header -->
      <div class="lt-review-topbar" id="lt-review-topbar">
        <div class="lt-review-topbar-left">
          <span class="lt-review-band-chip">Band: <strong>${LT._band || 0}</strong></span>
          <span class="lt-stat-correct">✓ ${totalCorrect} correct</span>
          <span class="lt-stat-wrong">✗ ${totalWrong} wrong</span>
        </div>
        <button class="lt-exit-btn lt-exit-btn-top" onclick="exitListeningTest()">✕ Exit</button>
      </div>

      <!-- Split panel -->
      <div class="lt-review-layout" id="lt-review-layout">
        <!-- Left: transcript -->
        <div class="lt-review-left" id="lt-review-left">
          <div class="lt-review-left-header">
            <span>📄 Transcript</span>
          </div>
          <div class="lt-review-transcript-body" id="lt-review-transcript-body"></div>
        </div>

        <!-- Resize handle -->
        <div class="lt-review-divider" id="lt-review-divider"></div>

        <!-- Right: question review list -->
        <div class="lt-review-right" id="lt-review-right">
          <div class="lt-review-right-header">
            <span id="lt-review-part-label">Answer Review</span>
          </div>
          <div class="lt-review-right-body" id="lt-review-right-body"></div>
        </div>
      </div>

      <!-- Bottom part navigation -->
      <div class="lt-review-nav" id="lt-review-nav">
        ${partNavItems}
      </div>

    </div>`;

  // ── Pre-render all parts ─────────────────────────────────
  _renderAllPartsForReview(resultMap);

  // ── Activate first part ──────────────────────────────────
  if (parts.length > 0) _switchReviewPart(parts[0].part_number);

  // ── Part nav click handlers ──────────────────────────────
  document.querySelectorAll('.lt-rnav-part-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _switchReviewPart(parseInt(btn.dataset.part, 10));
    });
  });

  // ── Resize handle ────────────────────────────────────────
  const layout   = document.getElementById('lt-review-layout');
  const divider  = document.getElementById('lt-review-divider');
  const leftPane = document.getElementById('lt-review-left');
  const rightPane= document.getElementById('lt-review-right');
  if (divider && layout && leftPane && rightPane) {
    _initReviewResize(divider, layout, leftPane, rightPane);
  }
}

/* Switch both panels to show only the given part number */
function _switchReviewPart(partNum) {
  // Update part label
  const label = document.getElementById('lt-review-part-label');
  if (label) label.textContent = `Part ${partNum} — Answer Review`;

  // Toggle transcript blocks
  document.querySelectorAll('.lt-transcript-block').forEach(block => {
    block.style.display = parseInt(block.dataset.part, 10) === partNum ? '' : 'none';
  });

  // Toggle question part sections
  document.querySelectorAll('.lt-review-part-section').forEach(sec => {
    sec.style.display = parseInt(sec.dataset.part, 10) === partNum ? '' : 'none';
  });

  // Reset scrolls to top
  const transcriptBody = document.getElementById('lt-review-transcript-body');
  if (transcriptBody) transcriptBody.scrollTop = 0;
  const rightBody = document.getElementById('lt-review-right-body');
  if (rightBody) rightBody.scrollTop = 0;

  // Update active button
  document.querySelectorAll('.lt-rnav-part-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.part, 10) === partNum);
  });
}

/* ── Pre-render all parts (transcript + questions) ─────── */
function _renderAllPartsForReview(resultMap) {
  const transcriptBody = document.getElementById('lt-review-transcript-body');
  const rightBody      = document.getElementById('lt-review-right-body');
  if (!transcriptBody || !rightBody) return;

  const parts = LT.test?.data?.parts || [];
  const hasTranscripts = LT._transcripts && Object.keys(LT._transcripts).length > 0;
  LT._resultsMap = resultMap;

  if (!hasTranscripts) {
    // Show 'no transcript' message in the transcript pane
    const msg = document.createElement('div');
    msg.className = 'lt-no-transcript';
    msg.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      No transcript available for this test.<br><small>Ask your admin to enable transcripts to unlock this feature.</small>`;
    transcriptBody.appendChild(msg);
  }

  parts.forEach(part => {
    const partKey = String(part.part_number);

    // ── Transcript block for this part ──────────────────────
    const block = document.createElement('div');
    block.className    = 'lt-transcript-block';
    block.dataset.part = part.part_number;
    block.style.display = 'none'; // hidden until activated

    if (hasTranscripts) {
      const transcript = (LT._transcripts || {})[partKey];
      if (transcript) {
        const hdr = document.createElement('div');
        hdr.className   = 'lt-transcript-part-header';
        hdr.textContent = `Part ${part.part_number} — Transcript`;
        block.appendChild(hdr);

        const body = document.createElement('div');
        body.className = 'lt-transcript-body';
        body.id        = `lt-transcript-part-${partKey}`;
        body.innerHTML = _buildTranscriptHtml(transcript, resultMap);
        block.appendChild(body);
      } else {
        const noTrans = document.createElement('div');
        noTrans.className = 'lt-no-transcript';
        noTrans.textContent = `No transcript for Part ${part.part_number}.`;
        block.appendChild(noTrans);
      }
    }
    transcriptBody.appendChild(block);

    // ── Question section for this part ──────────────────────
    const partSection = document.createElement('div');
    partSection.className    = 'lt-review-part-section';
    partSection.dataset.part = part.part_number;
    partSection.style.display = 'none'; // hidden until activated

    (part.question_groups || []).forEach(group => {
      const completionTypes = ['form_completion', 'note_completion', 'sentence_completion'];
      if (completionTypes.includes(group.type) && group.context_html) {
        const ctx = document.createElement('div');
        ctx.className = 'lt-review-context';
        ctx.innerHTML = group.context_html.replace(/\[\[(\d+)\]\]/g, (_, n) => {
          const r = resultMap[parseInt(n)];
          if (!r) return `<span class="lt-review-blank-empty">[Q${n}]</span>`;
          const correct = r.is_correct;
          return `<span class="lt-review-blank ${correct ? 'correct' : 'wrong'}">`
               + `<span class="lt-review-qbubble ${correct ? 'correct' : 'wrong'}">${n}</span>`
               + (correct ? '' : '<span class="lt-wrong-x">✕</span>')
               + `<span class="lt-review-blank-answer">${_esc(String(r.user_answer || ''))}</span>`
               + `</span>`
               + `<span class="lt-review-correct-inline">Answer: <em>${_esc(String(r.correct_answer || ''))}</em></span>`;
        });
        partSection.appendChild(ctx);

        (group.questions || []).forEach(q => {
          const r = resultMap[q.number];
          if (r && r.explanation) {
            const explainWrap = document.createElement('div');
            explainWrap.className = 'lt-review-explain-row';
            explainWrap.innerHTML = `
              <span class="lt-review-qbubble ${r.is_correct ? 'correct' : 'wrong'}">${q.number}</span>
              <button class="lt-explain-btn" onclick="this.nextElementSibling.classList.toggle('open');this.textContent=this.nextElementSibling.classList.contains('open')?'Explain less ◂':'Explain more ▸'">Explain more ▸</button>
              <div class="lt-explain-body">${_esc(r.explanation)}</div>`;
            partSection.appendChild(explainWrap);
          }
        });
      } else {
        partSection.appendChild(_renderGroup(group));
      }
    });

    rightBody.appendChild(partSection);
  });
}

/* ── Transcript HTML builder (unchanged) ─────────────────── */

/**
 * Parse {{highlighted text}}[[N]] markup into coloured spans.
 * Plain text is escaped. Lines become <br>.
 * The result bubble is green (correct) or red (wrong) based on resultMap.
 */
function _buildTranscriptHtml(rawText, resultMap) {
  let html = '';
  let lastIndex = 0;
  const re = /\{\{([\s\S]*?)\}\}\[\[(\d+)\]\]/g;
  let m;

  while ((m = re.exec(rawText)) !== null) {
    // Escaped plain text before this match
    if (m.index > lastIndex) {
      html += _escapeLines(rawText.slice(lastIndex, m.index));
    }

    const spanText = m[1];
    const qNum     = parseInt(m[2], 10);

    html += `<mark class="lt-loc-highlight" onclick="scrollToReviewCard(${qNum})" title="Q${qNum}">`
          + _esc(spanText)
          + ` <span class="lt-loc-badge">${qNum}</span>`
          + `</mark>`;

    lastIndex = re.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < rawText.length) {
    html += _escapeLines(rawText.slice(lastIndex));
  }

  return html;
}

function _escapeLines(str) {
  return _esc(str).replace(/\n/g, '<br>');
}

/* ── Helper to decorate active question rendering for review mode ── */
function _applyReviewDecoration(qNum, parentRow, qWrap) {
  if (!LT.submitted || !LT._resultsMap) return;
  const r = LT._resultsMap[qNum];
  if (!r) return;

  // Set card ID for scrolling
  qWrap.id = `lt-review-card-${qNum}`;

  // Add correct/wrong class to all elements with class 'lt-q-num' inside parentRow
  parentRow.querySelectorAll('.lt-q-num').forEach(numEl => {
    numEl.classList.add(r.is_correct ? 'correct' : 'wrong');
    
    // Insert marker after numEl if not already present
    if (!numEl.nextElementSibling || !numEl.nextElementSibling.classList.contains('lt-review-marker')) {
      const marker = document.createElement('span');
      marker.className = `lt-review-marker ${r.is_correct ? 'correct' : 'wrong'}`;
      marker.innerHTML = r.is_correct ? '✓' : '✕';
      marker.style.cssText = `color:${r.is_correct ? '#16a34a' : '#dc2626'};font-weight:700;margin-left:6px;margin-right:2px;font-size:1.1rem;align-self:center;line-height:1;`;
      numEl.after(marker);
    }
  });

  // Find where to append correct answer text:
  const stem = parentRow.querySelector('.lt-q-stem, .lt-mi-stem');
  const target = stem || parentRow;
  
  const cAns = Array.isArray(r.correct_answer) ? r.correct_answer.join('/') : String(r.correct_answer || '');
  const reviewSpan = document.createElement('span');
  reviewSpan.className = 'lt-review-correct-inline';
  reviewSpan.style.cssText = 'font-size:0.8rem;color:#475569;margin-left:12px;font-weight:600;align-self:center;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;';
  reviewSpan.innerHTML = `Answer: <em style="font-style:italic;color:#1e293b;font-weight:700;">${_esc(cAns)}</em>`;

  if (r.explanation) {
    const btn = document.createElement('button');
    btn.className = 'lt-explain-btn';
    btn.style.cssText = 'margin-left:10px;align-self:center;';
    btn.textContent = 'Explain more ▸';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const body = qWrap.querySelector('.lt-explain-body');
      if (body) {
        body.classList.toggle('open');
        btn.textContent = body.classList.contains('open') ? 'Explain less ◂' : 'Explain more ▸';
      }
    });
    reviewSpan.appendChild(btn);

    const body = document.createElement('div');
    body.className = 'lt-explain-body';
    body.style.width = '100%';
    body.textContent = r.explanation;
    qWrap.appendChild(body);
  }

  target.appendChild(reviewSpan);
}

/* _renderReviewQuestions is superseded by _renderAllPartsForReview */
/* kept as no-op for safety */
function _renderReviewQuestions(container, resultMap) {}

/* Called from transcript highlight onclick */
window.scrollToReviewCard = function (qNum) {
  const card = document.getElementById(`lt-review-card-${qNum}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/* ── Resize handle between left/right review panes ────────── */
function _initReviewResize(divider, layout, leftPane, rightPane) {
  let startX, startLeftW;

  divider.addEventListener('mousedown', e => {
    startX     = e.clientX;
    startLeftW = leftPane.getBoundingClientRect().width;
    divider.classList.add('dragging');

    const onMove = ev => {
      const dx      = ev.clientX - startX;
      const totalW  = layout.getBoundingClientRect().width;
      const newLeft = Math.min(Math.max(startLeftW + dx, 220), totalW - 8 - 300);
      const newRight= totalW - 8 - newLeft;
      layout.style.gridTemplateColumns = `${newLeft}px 8px ${newRight}px`;
    };
    const onUp = () => {
      divider.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
}


window._cleanupListeningTest = function _cleanupListeningTest() {
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
