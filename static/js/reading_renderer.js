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

    // If server returned HTML (e.g. login redirect), it means user is not authenticated
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('You must be logged in to take this test. Please <a href="/auth/login">log in</a> and try again.');
    }

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
      return _renderRadio(group);
    case 'mcq_choose_2':
    case 'mcq_choose_3':
      return _renderCheckbox(group);
    case 'matching_information':
    case 'matching_features':
    case 'matching_headings':
    case 'matching_sentence_endings':
      return _renderDropdown(group);
    case 'summary_completion':    return _renderSummaryCompletion(group);
    case 'note_completion':       return _renderNoteCompletion(group);
    case 'sentence_completion':   return _renderSentenceCompletion(group);
    case 'table_completion':      return _renderTableCompletion(group);
    case 'flow_chart_completion': return _renderFlowChartCompletion(group);
    case 'short_answer':          return _renderShortAnswer(group);
    case 'diagram_labeling':
      return _renderDiagram(group);
    default:
      return `<p style="color:var(--reading-text-secondary);font-style:italic">Renderer for type "${_esc(group.type)}" coming soon.</p>`;
  }
};

/* ────────────────────────────────────────────────────────────
   Pattern 1: Radio Button (TFNG / YNNG / MCQ Single)
──────────────────────────────────────────────────────────── */

/**
 * Fixed option sets for TFNG and YNNG.
 * MCQ Single builds its options from q.options[].
 */
const _RADIO_FIXED_OPTS = {
  tfng: [
    { letter: 'A', text: 'TRUE',      value: 'TRUE'      },
    { letter: 'B', text: 'FALSE',     value: 'FALSE'     },
    { letter: 'C', text: 'NOT GIVEN', value: 'NOT GIVEN' },
  ],
  ynng: [
    { letter: 'A', text: 'YES',       value: 'YES'       },
    { letter: 'B', text: 'NO',        value: 'NO'        },
    { letter: 'C', text: 'NOT GIVEN', value: 'NOT GIVEN' },
  ],
};

function _renderRadio (group) {
  const fixedOpts = _RADIO_FIXED_OPTS[group.type] || null;

  let html = '';
  (group.questions || []).forEach(q => {
    const opts = fixedOpts
      ? fixedOpts
      : (q.options || []).map(o => ({
          letter:  o.letter,
          text:    o.text,
          subtext: o.subtext || '',
          value:   o.letter,
        }));

    const optionsHtml = opts.map(o => {
      const inputId = `q_${q.number}_${o.letter.toLowerCase()}`;
      const textGroup = o.subtext
        ? `<div class="option-text-group">
             <span class="option-text">${_esc(o.text)}</span>
             <span class="option-subtext">${_esc(o.subtext)}</span>
           </div>`
        : `<span class="option-text">${_esc(o.text)}</span>`;
      return `
        <div class="radio-option">
          <input type="radio" id="${inputId}" name="q_${q.number}" value="${_esc(o.value)}"
                 data-qnum="${q.number}" onchange="ReadingAnswers.set(${q.number}, this.value)">
          <label for="${inputId}" class="option-label">
            <span class="option-letter">${_esc(o.letter)}</span>
            ${textGroup}
          </label>
        </div>`;
    }).join('');

    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${_esc(q.text || '')}</span>
        </div>
        <div class="radio-group">${optionsHtml}</div>
      </div>`;
  });
  return html;
}

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

/* ────────────────────────────────────────────────────────────
   Pattern 2: Checkbox / Multi-Select
   Handles: mcq_choose_2, mcq_choose_3
──────────────────────────────────────────────────────────── */

/**
 * Called on every checkbox change.
 * - Collects all checked values for this question group.
 * - If at max: disables every unchecked box in the group.
 * - Below max: re-enables all boxes.
 * - Saves comma-joined answer string (e.g. "A,C").
 */
window._onCheckboxChange = function (el) {
  const groupId = el.dataset.groupid;
  const qNum    = el.dataset.qnum;
  const max     = parseInt(el.dataset.max);

  // All checkboxes in this question group
  const allBoxes = document.querySelectorAll(
    `input[type="checkbox"][data-groupid="${groupId}"]`
  );
  const checked = Array.from(allBoxes).filter(cb => cb.checked);
  const count   = checked.length;

  allBoxes.forEach(cb => {
    if (!cb.checked) {
      cb.disabled = count >= max;
      // Reflect disabled state on label
      const label = cb.closest('.checkbox-option');
      if (label) label.classList.toggle('checkbox-disabled', count >= max);
    } else {
      cb.disabled = false;
      const label = cb.closest('.checkbox-option');
      if (label) label.classList.remove('checkbox-disabled');
    }
  });

  // Save answer as sorted comma-separated letters
  const answer = checked.map(cb => cb.value).sort().join(',');
  ReadingAnswers.set(qNum, answer);
};

/**
 * Render mcq_choose_2 / mcq_choose_3.
 * All questions in the group share a pool of options (q.options[]).
 * Each question is rendered independently with its own checkbox set.
 */
function _renderCheckbox (group) {
  const max     = group.max_selections
                    || (group.type === 'mcq_choose_2' ? 2 : 3);
  const word    = max === 2 ? 'TWO' : 'THREE';
  const groupId = group.group_id || `grp_${Math.random().toString(36).slice(2)}`;

  let html = '';

  (group.questions || []).forEach(q => {
    const opts = q.options || [];

    const optionsHtml = opts.map(o => {
      const inputId = `q_${q.number}_${_esc(o.letter).toLowerCase()}`;
      return `
        <div class="checkbox-option" id="cb-row-${inputId}">
          <input type="checkbox"
                 id="${inputId}"
                 name="q_${q.number}"
                 value="${_esc(o.letter)}"
                 data-qnum="${q.number}"
                 data-max="${max}"
                 data-groupid="${_esc(groupId)}"
                 onchange="_onCheckboxChange(this)">
          <label for="${inputId}" class="option-label">
            <span class="option-letter">${_esc(o.letter)}</span>
            <span class="option-text">${_esc(o.text || '')}</span>
          </label>
        </div>`;
    }).join('');

    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${_esc(q.text || '')}</span>
        </div>
        <div class="checkbox-instruction">Choose <strong>${word}</strong> letters, <strong>A–${_esc(opts[opts.length - 1]?.letter || 'E')}</strong>.</div>
        <div class="checkbox-group">${optionsHtml}</div>
      </div>`;
  });

  return html;
}

/* ────────────────────────────────────────────────────────────
   Pattern 3: Dropdown / Matching
   Handles: matching_information, matching_features,
            matching_headings, matching_sentence_endings
──────────────────────────────────────────────────────────── */

/** Roman numeral conversion (1-20) */
const _ROMAN = ['', 'i','ii','iii','iv','v','vi','vii','viii','ix','x',
                    'xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx'];
function _toRoman (n) { return _ROMAN[n] || String(n); }

/**
 * Build the option pool HTML chip-list.
 * For matching_headings, pool items show Roman numerals.
 * For others, pool items show the letter + period + text chip.
 */
function _buildPoolHtml (group) {
  const pool      = group.option_pool || [];
  const poolLabel = group.option_pool_label || 'List of Options';
  const isHeadings = group.type === 'matching_headings';

  if (!pool.length) return '';

  const chips = pool.map((o, idx) => {
    const key = isHeadings ? _toRoman(idx + 1) : _esc(o.letter);
    const text = _esc(o.text);
    return `<span class="pool-item"><strong>${key}</strong> &nbsp;${text}</span>`;
  }).join('');

  return `
    <div class="option-pool-box">
      <div class="pool-label">${_esc(poolLabel)}</div>
      <div class="pool-items">${chips}</div>
    </div>`;
}

/**
 * Build the <select> dropdown for one question.
 * For matching_headings, options are Roman numerals.
 * For all others, options are the pool letters (A, B, C…).
 */
function _buildDropdownHtml (group, qNum) {
  const pool = group.option_pool || [];
  const isHeadings = group.type === 'matching_headings';

  const options = pool.map((o, idx) => {
    const val   = isHeadings ? _toRoman(idx + 1) : _esc(o.letter);
    const label = isHeadings
      ? `${_toRoman(idx + 1)}. ${_esc(o.text)}`
      : `${_esc(o.letter)}&nbsp;&nbsp;${_esc(o.text)}`;
    return `<option value="${val}">${isHeadings ? _toRoman(idx + 1) + '. ' + o.text : o.letter + '  ' + o.text}</option>`;
  }).join('');

  return `
    <select class="select-answer" data-qnum="${qNum}"
            onchange="ReadingAnswers.set(${qNum}, this.value)">
      <option value="">— choose —</option>
      ${options}
    </select>`;
}

/**
 * Main dispatcher for all 4 matching/dropdown types.
 *
 * matching_information    — "Which paragraph mentions X?" → dropdown of A-G
 * matching_features       — "Match feature to person/place" → named pool
 * matching_headings       — Choose Roman numeral heading for each section
 * matching_sentence_endings — Sentence beginnings matched to endings in pool
 */
function _renderDropdown (group) {
  const pool      = group.option_pool || [];
  const allowReuse = group.allow_reuse === true;
  const questions  = group.questions || [];

  // ── Option pool box ──────────────────────────────────────
  let html = _buildPoolHtml(group);

  // ── NB note ──────────────────────────────────────────────
  if (allowReuse) {
    html += `
      <div class="matching-nb-note">
        <strong>NB</strong> You may use any letter more than once.
      </div>`;
  }

  // ── Per-question rows ─────────────────────────────────────
  questions.forEach(q => {
    const dropdown = _buildDropdownHtml(group, q.number);

    // For sentence_endings: stem already has the sentence beginning;
    //   the dropdown completes it — we put dropdown inline at end.
    // For all others: stem is the question text, dropdown is after.
    const isEndings = group.type === 'matching_sentence_endings';

    if (isEndings) {
      // Sentence beginning + inline dropdown on same line
      html += `
        <div class="question-item" id="q-${q.number}">
          <div class="question-text-inline matching-sentence-row">
            <span class="question-number">${q.number}</span>
            <span class="question-stem">${_esc(q.text || '')}</span>
            ${dropdown}
          </div>
        </div>`;
    } else {
      // Standard layout: question number + stem, then dropdown below-right
      html += `
        <div class="question-item" id="q-${q.number}">
          <div class="question-text-inline">
            <span class="question-number">${q.number}</span>
            <span class="question-stem">${_esc(q.text || '')}</span>
          </div>
          <div class="matching-dropdown-row">
            ${dropdown}
          </div>
        </div>`;
    }
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

/* ────────────────────────────────────────────────────────────
   Pattern 5: Diagram / Image Labeling
──────────────────────────────────────────────────────────── */

/**
 * Render diagram_labeling group.
 *
 * JSON shape:
 *   group.image_url      — hosted image URL
 *   group.image_caption  — optional caption below image
 *   group.answer_type    — "text" (default) | "dropdown"
 *   group.option_pool    — [{letter, text}] required when answer_type="dropdown"
 *   group.questions      — [{number, text, answer}]
 *     q.text is the label shown beside the input, e.g. "Label 20" or a placement hint
 */
function _renderDiagram (group) {
  const questions  = group.questions  || [];
  const pool       = group.option_pool || [];
  const answerType = group.answer_type || 'text';
  const imageUrl   = group.image_url   || '';
  const caption    = group.image_caption || '';

  // ── Image block ──────────────────────────────────────────
  let html = '<div class="diagram-image-wrapper">';

  if (imageUrl) {
    html += `<img src="${_esc(imageUrl)}" alt="${_esc(caption || 'Diagram')}"
                  class="diagram-image" loading="lazy">`;
  } else {
    html += `
      <div class="diagram-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18M3.75 4.5h16.5A.75.75 0 0121 5.25v13.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V5.25A.75.75 0 013.75 4.5z" />
        </svg>
        <span>Diagram image not available</span>
      </div>`;
  }

  if (caption) {
    html += `<p class="diagram-caption">${_esc(caption)}</p>`;
  }

  html += '</div>';  // end diagram-image-wrapper

  // ── Label inputs ──────────────────────────────────────────
  html += '<div class="diagram-labels">';

  questions.forEach(q => {
    let input;
    if (answerType === 'dropdown' && pool.length) {
      const opts = pool.map(o =>
        `<option value="${_esc(o.letter)}">${_esc(o.letter)}&nbsp;&nbsp;${_esc(o.text)}</option>`
      ).join('');
      input = `<select class="select-answer" data-qnum="${q.number}"
                       onchange="ReadingAnswers.set(${q.number}, this.value)">
                 <option value="">— choose —</option>
                 ${opts}
               </select>`;
    } else {
      input = `<input type="text" class="completion-input diagram-input"
                      data-qnum="${q.number}"
                      placeholder="answer"
                      oninput="ReadingAnswers.set(${q.number}, this.value)">` ;
    }

    html += `
      <div class="question-item diagram-label-row" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          ${ q.text ? `<span class="question-stem">${_esc(q.text)}</span>` : '' }
          ${input}
        </div>
      </div>`;
  });

  html += '</div>';  // end diagram-labels
  return html;
}

/* ────────────────────────────────────────────────────────────
   Pattern 4: Text Input / Completion Renderers
──────────────────────────────────────────────────────────── */

/**
 * Replace [[N]] markers in an HTML string with inline <input> elements.
 * context_html is admin-authored content — trusted, not user input.
 */
function _replaceBlankMarkers (html) {
  return html.replace(/\[\[(\d+)\]\]/g, (_, n) =>
    `<input type="text" class="completion-input" data-qnum="${n}" ` +
    `placeholder="${n}" oninput="ReadingAnswers.set(${n}, this.value)">`
  );
}

/** summary_completion — paragraph(s) of text with inline blanks */
function _renderSummaryCompletion (group) {
  const ctx = _replaceBlankMarkers(group.context_html || '');
  return `<div class="completion-context-box">${ctx}</div>`;
}

/** note_completion — notes / bullet list with inline blanks */
function _renderNoteCompletion (group) {
  const ctx = _replaceBlankMarkers(group.context_html || '');
  return `<div class="completion-context-box">${ctx}</div>`;
}

/** sentence_completion — each question is a standalone sentence; [[N]] is inline */
function _renderSentenceCompletion (group) {
  let html = '';
  (group.questions || []).forEach(q => {
    const sentence = _replaceBlankMarkers(q.text || '');
    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${sentence}</span>
        </div>
      </div>`;
  });
  return html;
}

/** table_completion — context_html is an HTML <table> with [[N]] blanks in cells */
function _renderTableCompletion (group) {
  const ctx = _replaceBlankMarkers(group.context_html || '');
  return `<div class="table-completion-wrapper">${ctx}</div>`;
}

/** flow_chart_completion — context_html contains .flowchart-box / .flowchart-arrow divs */
function _renderFlowChartCompletion (group) {
  const ctx = _replaceBlankMarkers(group.context_html || '');
  return `<div class="flowchart-container">${ctx}</div>`;
}

/** short_answer — question text shown, answer input rendered below */
function _renderShortAnswer (group) {
  let html = '';
  (group.questions || []).forEach(q => {
    html += `
      <div class="question-item" id="q-${q.number}">
        <div class="question-text-inline">
          <span class="question-number">${q.number}</span>
          <span class="question-stem">${_esc(q.text || '')}</span>
        </div>
        <div class="short-answer-input-row">
          <input type="text" class="completion-input"
                 data-qnum="${q.number}" placeholder="answer"
                 oninput="ReadingAnswers.set(${q.number}, this.value)">
        </div>
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
  _showModal(
    'Time is up! Your answers will be submitted now.',
    () => _submitTest(),   // OK
    null,                  // no cancel — time really is up
    { okLabel: 'Submit Now', showCancel: false }
  );
}

/* ────────────────────────────────────────────────────────────
   Submit
──────────────────────────────────────────────────────────── */
window.submitReadingTest = async function () {
  if (!ReadingTest.testData) return;
  _showModal(
    'Submit your answers now? You cannot change them afterwards.',
    () => _submitTest(),
    null,
    { okLabel: 'Submit Test', okClass: 'modal-btn-success' }
  );
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
      _showModal(
        `✅ Test submitted!<br>Score: <strong>${data.score}/${data.total}</strong> &nbsp;|&nbsp; Band: <strong>${data.band_score}</strong>`,
        () => window.showSection('landing'),
        null,
        { okLabel: 'Back to Dashboard', showCancel: false }
      );
    } else {
      _showModal(`Submission failed: ${data.error || 'Unknown error'}`, null, null, { showCancel: false });
    }
  } catch (err) {
    _showModal('Network error during submission. Please try again.', null, null, { showCancel: false });
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

/* ────────────────────────────────────────────────────────────
   Custom Modal (replaces window.confirm / window.alert)
   Renders inside #readingTestSection so it is never blocked.
──────────────────────────────────────────────────────────── */
/**
 * Show a non-blocking confirmation modal.
 * @param {string}   message    - HTML message string
 * @param {Function} onOk       - called when user clicks OK / primary button
 * @param {Function} [onCancel] - called when user clicks Cancel (optional)
 * @param {Object}   [opts]     - { okLabel, okClass, showCancel }
 */
function _showModal (message, onOk, onCancel, opts = {}) {
  const okLabel    = opts.okLabel    ?? 'OK';
  const okClass    = opts.okClass    ?? 'modal-btn-primary';
  const showCancel = opts.showCancel ?? true;

  // Remove any existing modal
  document.getElementById('readingModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'readingModal';
  overlay.className = 'reading-modal-overlay';
  overlay.innerHTML = `
    <div class="reading-modal-box" role="dialog" aria-modal="true">
      <div class="reading-modal-body">${message}</div>
      <div class="reading-modal-actions">
        ${showCancel ? `<button class="modal-btn modal-btn-cancel" id="modalCancelBtn">Cancel</button>` : ''}
        <button class="modal-btn ${okClass}" id="modalOkBtn">${okLabel}</button>
      </div>
    </div>`;

  // Append inside the reading section so it inherits z-index stacking
  const section = document.getElementById('readingTestSection') || document.body;
  section.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('#modalOkBtn').addEventListener('click', () => {
    close();
    if (typeof onOk === 'function') onOk();
  });

  const cancelBtn = overlay.querySelector('#modalCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      close();
      if (typeof onCancel === 'function') onCancel();
    });
  }

  // Close on backdrop click (only if cancel is available)
  if (showCancel) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { close(); if (typeof onCancel === 'function') onCancel(); }
    });
  }

  // Focus the primary button
  requestAnimationFrame(() => overlay.querySelector('#modalOkBtn')?.focus());
}
