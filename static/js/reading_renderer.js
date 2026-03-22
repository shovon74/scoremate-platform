/**
 * ScoreMate Reading Module — reading_renderer.js
 * Handles: layout init, draggable resize, timer, part/tab switching,
 *          question pill generation, and (later) question rendering.
 */

/* ────────────────────────────────────────────────────────────
   Module State
──────────────────────────────────────────────────────────── */
const ReadingTest = {
  testData:      null,   // full test JSON from API
  currentPart:   0,      // 0-indexed part
  timeLimitSecs: 60 * 60,
  timeRemaining: 60 * 60,
  timerInterval: null,
  answers:       {},     // { q_number: user_answer }
  startTime:     null,
};

/* ────────────────────────────────────────────────────────────
   Boot — called by showSection('reading_test', slug)
──────────────────────────────────────────────────────────── */
window.initReadingTest = async function (slug) {
  const section = document.getElementById('readingTestSection');
  if (!section) return;

  // Reset state
  Object.assign(ReadingTest, {
    testData: null, currentPart: 0, answers: {},
    timeRemaining: 60 * 60, startTime: Date.now(),
  });
  clearInterval(ReadingTest.timerInterval);

  // Show shell immediately
  section.classList.add('reading-active');
  _setPassage('<p class="passage-loading">Loading passage…</p>');
  _setQuestions('<p class="questions-loading">Loading questions…</p>');
  _buildPills([]);

  // Fetch test data
  try {
    const res = await fetch(`/api/reading/tests/${slug}`);
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load test');

    ReadingTest.testData = json.test;
    ReadingTest.timeLimitSecs = (json.test.time_limit || 60) * 60;
    ReadingTest.timeRemaining = ReadingTest.timeLimitSecs;

    // Update title
    const titleEl = document.getElementById('readingTestTitle');
    if (titleEl) titleEl.textContent = json.test.title || 'Reading Test';

    _buildPartTabs();
    _switchPart(0);
    _startTimer();
  } catch (err) {
    _setPassage(`<p class="passage-loading" style="color:#dc2626">Error: ${err.message}</p>`);
    _setQuestions('');
  }
};

/* ────────────────────────────────────────────────────────────
   Part Tabs
──────────────────────────────────────────────────────────── */
function _buildPartTabs () {
  const parts = ReadingTest.testData?.data?.parts || [];
  const headerTabs = document.getElementById('readingPartTabs');
  const bottomTabs = document.getElementById('readingBottomPartTabs');

  [headerTabs, bottomTabs].forEach(container => {
    if (!container) return;
    container.innerHTML = '';
    parts.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = container === headerTabs ? 'reading-part-tab' : 'bottom-part-tab';
      btn.textContent = `Part ${p.part_number}`;
      btn.dataset.part = i;
      btn.setAttribute('id', `${container.id}-part${i}`);
      btn.addEventListener('click', () => _switchPart(i));
      container.appendChild(btn);
    });
  });
}

function _switchPart (partIndex) {
  ReadingTest.currentPart = partIndex;
  const parts = ReadingTest.testData?.data?.parts || [];
  const part = parts[partIndex];
  if (!part) return;

  // Update active class on all tabs
  document.querySelectorAll('.reading-part-tab, .bottom-part-tab').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.part) === partIndex);
  });

  // Render passage
  _renderPassage(part.passage);

  // Render questions placeholder (real renderers come in Step 5+)
  _renderQuestionGroups(part.question_groups || []);

  // Build question pills for this part
  const allNums = _getAllQuestionNumbers(part.question_groups || []);
  _buildPills(allNums);

  // Scroll both panels to top
  document.getElementById('readingPassagePanel')?.scrollTo(0, 0);
  document.getElementById('readingQuestionPanel')?.scrollTo(0, 0);
}

/* ────────────────────────────────────────────────────────────
   Passage Renderer
──────────────────────────────────────────────────────────── */
function _renderPassage (passage) {
  if (!passage) { _setPassage(''); return; }

  let html = '';
  if (passage.title) {
    html += `<h2 class="passage-title">${_esc(passage.title)}</h2>`;
  }

  (passage.sections || []).forEach(section => {
    if (section.label || section.heading) {
      html += `<div class="passage-section-label">${section.label ? _esc(section.label) + '. ' : ''}${_esc(section.heading || '')}</div>`;
    }
    html += '<div class="passage-text">';
    (section.paragraphs || []).forEach(p => {
      html += `<p>${p}</p>`;
    });
    html += '</div>';
  });

  _setPassage(html);
}

/* ────────────────────────────────────────────────────────────
   Question Group Shell Renderer  (patterns wired in Step 5+)
──────────────────────────────────────────────────────────── */
function _renderQuestionGroups (groups) {
  if (!groups.length) {
    _setQuestions('<p class="questions-loading">No questions for this part.</p>');
    return;
  }

  let html = '';
  groups.forEach(group => {
    const qRange = group.question_range || '';
    const instructions = group.instructions || '';
    const constraint = group.constraint || '';

    html += `
      <div class="question-section" data-group-type="${_esc(group.type || '')}">
        <div class="question-section-header">
          <h2 class="question-section-title">Questions ${_esc(qRange)}</h2>
        </div>
        ${instructions ? `<div class="question-section-instruction">${_esc(instructions)}</div>` : ''}
        ${constraint ? `<div class="constraint-text">${_esc(constraint)}</div>` : ''}
        <div class="question-group-body" data-group-id="${_esc(group.group_id || '')}">
          ${renderQuestionGroup(group)}
        </div>
      </div>`;
  });

  _setQuestions(html);
  _attachAnswerListeners();
}

/**
 * Dispatcher — routes to the correct renderer based on group.type.
 * Pattern renderers (radio, checkbox, dropdown, text, image) are implemented
 * in Step 5+. This step returns a placeholder per group.
 */
window.renderQuestionGroup = function (group) {
  // TODO: replace these stubs with full renderers in Step 5+
  switch (group.type) {
    case 'tfng':
    case 'ynng':
    case 'mcq_single':
      return _renderRadioStub(group);
    case 'mcq_choose_2':
    case 'mcq_choose_3':
      return _renderCheckboxStub(group);
    case 'matching_information':
    case 'matching_features':
    case 'matching_headings':
    case 'matching_sentence_endings':
      return _renderDropdownStub(group);
    case 'summary_completion':
    case 'note_completion':
    case 'sentence_completion':
    case 'short_answer':
    case 'table_completion':
    case 'flow_chart_completion':
      return _renderTextInputStub(group);
    case 'diagram_labeling':
      return _renderDiagramStub(group);
    default:
      return `<p style="color:var(--reading-text-secondary);font-style:italic">Renderer for type "${_esc(group.type)}" coming soon.</p>`;
  }
};

/* ─ Stub Renderers (placeholder until Step 5) ─────────────── */
function _renderRadioStub (group) {
  const labels = group.type === 'tfng'  ? ['TRUE', 'FALSE', 'NOT GIVEN']
               : group.type === 'ynng'  ? ['YES', 'NO', 'NOT GIVEN']
               : null; // mcq_single uses group.questions[].options

  let html = '';
  (group.questions || []).forEach(q => {
    const opts = labels || (q.options || []).map(o => `${o.letter}. ${o.text}`);
    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${q.text || ''}</span>
        </div>
        <div class="radio-group" style="margin-left:38px">
          ${opts.map((opt, idx) => `
            <label class="radio-option">
              <input type="radio" name="q_${q.number}" value="${_esc(String(opt).split('.')[0].trim())}"
                     data-qnum="${q.number}" onchange="ReadingAnswers.set(${q.number}, this.value)">
              <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
              <span class="option-text">${_esc(String(opt))}</span>
            </label>`).join('')}
        </div>
      </div>`;
  });
  return html;
}

function _renderCheckboxStub (group) {
  const maxSel = group.type === 'mcq_choose_2' ? 2 : 3;
  let html = `<p style="font-size:14px;color:var(--reading-text-secondary);margin-bottom:8px">Choose <strong>${maxSel}</strong> letters.</p>`;
  (group.questions || []).forEach(q => {
    (q.options || []).forEach(opt => {
      html += `
        <label class="checkbox-option" style="margin-left:38px;display:flex;align-items:center;gap:8px;padding:6px 0">
          <input type="checkbox" name="q_${q.number}" value="${_esc(opt.letter)}"
                 data-qnum="${q.number}" data-max="${maxSel}">
          <span class="option-letter">${_esc(opt.letter)}</span>
          <span class="option-text">${_esc(opt.text || '')}</span>
        </label>`;
    });
  });
  return html;
}

function _renderDropdownStub (group) {
  const pool = group.option_pool || [];
  let html = '';
  if (pool.length) {
    html += `<div class="option-pool-box" style="margin-bottom:12px">
      <div class="pool-label">${_esc(group.option_pool_label || 'Options')}</div>
      <div class="pool-items">${pool.map(o => `<span class="pool-item">${_esc(o.letter)}. ${_esc(o.text)}</span>`).join('')}</div>
    </div>`;
  }
  (group.questions || []).forEach(q => {
    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${q.text || ''}</span>
          <select class="select-answer" data-qnum="${q.number}"
                  onchange="ReadingAnswers.set(${q.number}, this.value)">
            <option value="">— select —</option>
            ${pool.map(o => `<option value="${_esc(o.letter)}">${_esc(o.letter)}</option>`).join('')}
          </select>
        </div>
      </div>`;
  });
  return html;
}

function _renderTextInputStub (group) {
  let html = '';
  (group.questions || []).forEach(q => {
    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${q.text || ''}</span>
          <input type="text" class="text-answer" placeholder="…"
                 data-qnum="${q.number}"
                 oninput="ReadingAnswers.set(${q.number}, this.value)">
        </div>
      </div>`;
  });
  return html;
}

function _renderDiagramStub (group) {
  let html = group.image_url
    ? `<img src="${_esc(group.image_url)}" alt="Diagram" style="max-width:100%;margin-bottom:12px">`
    : `<div style="border:1px dashed var(--reading-border);padding:20px;text-align:center;color:var(--reading-text-secondary);margin-bottom:12px">Diagram image will appear here</div>`;
  (group.questions || []).forEach(q => {
    html += `
      <div class="question-item" id="q-${q.number}" style="flex-direction:row;align-items:center">
        <span class="question-number">${q.number}</span>
        <input type="text" class="text-answer" placeholder="Label…"
               data-qnum="${q.number}"
               oninput="ReadingAnswers.set(${q.number}, this.value)">
      </div>`;
  });
  return html;
}

/* ────────────────────────────────────────────────────────────
   Answer Tracking
──────────────────────────────────────────────────────────── */
window.ReadingAnswers = {
  set (qNum, value) {
    ReadingTest.answers[String(qNum)] = value;
    _updatePill(qNum, value !== '');
  }
};

function _attachAnswerListeners () {
  // Checkbox max-selection enforcement
  document.querySelectorAll('input[type="checkbox"][data-max]').forEach(cb => {
    cb.addEventListener('change', () => {
      const name  = cb.name;
      const max   = parseInt(cb.dataset.max);
      const qNum  = cb.dataset.qnum;
      const group = document.querySelectorAll(`input[name="${name}"]:checked`);
      if (group.length > max) { cb.checked = false; return; }
      const selected = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
                            .map(el => el.value).join(',');
      ReadingAnswers.set(qNum, selected);
    });
  });
}

/* ────────────────────────────────────────────────────────────
   Question Pills
──────────────────────────────────────────────────────────── */
function _getAllQuestionNumbers (groups) {
  const nums = [];
  groups.forEach(g => (g.questions || []).forEach(q => nums.push(q.number)));
  return nums;
}

function _buildPills (numbers) {
  const container = document.getElementById('readingQuestionPills');
  if (!container) return;
  container.innerHTML = numbers.map(n =>
    `<span class="q-pill" id="pill-${n}" data-qnum="${n}"
           onclick="_scrollToQuestion(${n})">${n}</span>`
  ).join('');
}

function _updatePill (qNum, answered) {
  const pill = document.getElementById(`pill-${qNum}`);
  if (pill) pill.classList.toggle('answered', answered);
}

window._scrollToQuestion = function (qNum) {
  const el = document.getElementById(`q-${qNum}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/* ────────────────────────────────────────────────────────────
   Timer
──────────────────────────────────────────────────────────── */
function _startTimer () {
  clearInterval(ReadingTest.timerInterval);
  _renderTimer();
  ReadingTest.timerInterval = setInterval(() => {
    ReadingTest.timeRemaining--;
    _renderTimer();
    if (ReadingTest.timeRemaining <= 0) {
      clearInterval(ReadingTest.timerInterval);
      _handleTimeUp();
    }
  }, 1000);
}

function _renderTimer () {
  const el = document.getElementById('readingTimer');
  if (!el) return;
  const t = ReadingTest.timeRemaining;
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  el.className = 'reading-timer';
  if (t <= 300) el.classList.add('critical');
  else if (t <= 600) el.classList.add('warning');
}

function _handleTimeUp () {
  if (confirm('Time is up! Your answers will be submitted now.')) {
    _submitTest();
  }
}

/* ────────────────────────────────────────────────────────────
   Submit
──────────────────────────────────────────────────────────── */
window.submitReadingTest = async function () {
  if (!ReadingTest.testData) return;
  if (!confirm('Submit your answers now?')) return;
  _submitTest();
};

async function _submitTest () {
  clearInterval(ReadingTest.timerInterval);
  const timeTaken = Math.round((Date.now() - ReadingTest.startTime) / 1000);

  try {
    const res = await fetch(`/api/reading/tests/${ReadingTest.testData.slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: ReadingTest.answers, time_taken: timeTaken })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Score: ${data.score}/${data.total} | Band: ${data.band_score}`);
      window.showSection('landing');
    } else {
      alert('Submission failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error during submission.');
  }
}

/* ────────────────────────────────────────────────────────────
   Skimming Mode Toggle
──────────────────────────────────────────────────────────── */
window.toggleSkimmingMode = function (checked) {
  const section = document.getElementById('readingTestSection');
  if (section) section.dataset.skimming = checked ? 'true' : 'false';
};

/* ────────────────────────────────────────────────────────────
   Draggable Resize Handle
──────────────────────────────────────────────────────────── */
window.initReadingResize = function () {
  const handle   = document.getElementById('readingResizeHandle');
  const container = document.getElementById('readingTestContainer');
  if (!handle || !container) return;

  let dragging = false;
  let startX, startCols;

  handle.addEventListener('mousedown', e => {
    dragging  = true;
    startX    = e.clientX;
    const cols = getComputedStyle(container).gridTemplateColumns.split(' ');
    startCols = parseFloat(cols[0]);   // px width of left panel
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const total = container.offsetWidth - 8; // minus handle
    const delta = e.clientX - startX;
    let leftPx  = Math.min(Math.max(startCols + delta, total * 0.2), total * 0.8);
    container.style.gridTemplateColumns = `${leftPx}px 8px 1fr`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Touch support
  handle.addEventListener('touchstart', e => {
    dragging  = true;
    startX    = e.touches[0].clientX;
    const cols = getComputedStyle(container).gridTemplateColumns.split(' ');
    startCols = parseFloat(cols[0]);
    handle.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const total = container.offsetWidth - 8;
    const delta = e.touches[0].clientX - startX;
    let leftPx  = Math.min(Math.max(startCols + delta, total * 0.2), total * 0.8);
    container.style.gridTemplateColumns = `${leftPx}px 8px 1fr`;
  }, { passive: true });

  document.addEventListener('touchend', () => { dragging = false; handle.classList.remove('dragging'); });
};

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
function _setPassage (html) {
  const el = document.getElementById('readingPassagePanel');
  if (el) el.innerHTML = html;
}

function _setQuestions (html) {
  const el = document.getElementById('readingQuestionPanel');
  if (el) el.innerHTML = html;
}

function _esc (str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}
