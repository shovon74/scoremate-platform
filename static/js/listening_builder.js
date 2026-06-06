/**
 * listening_builder.js — ScoreMate Listening Quiz Builder
 *
 * Manages state for: basic settings, 4-part audio/transcripts, question groups.
 *
 * Data flow:
 *   window.BUILDER_DATA → loadFromTestData() → LB (state) → renderAll()
 *   saveTest() → buildTestJson() → POST /admin/listening/save
 *                               or PUT  /admin/listening/<id>
 *
 * Key differences from reading_builder.js:
 *   - LB.parts: fixed array of 4 parts (not dynamic)
 *   - Tab 2 = audio upload + optional transcript per part
 *   - Question types: form_completion, note_completion, sentence_completion,
 *                     mcq_multiple, map_labelling
 *   - Each question has: acceptable_answers[], answer_location
 */

/* ─────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────── */
function uid() {
  return 'id' + Math.random().toString(36).slice(2, 11);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toSlug(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-');
}

/* ─────────────────────────────────────────────────────────
   Toast
───────────────────────────────────────────────────────── */
let _toastTimer = null;

function showToast(msg, type = 'info') {
  const el = document.getElementById('builderToast');
  if (!el) return;
  el.textContent = msg;
  el.className = `builder-toast ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.add('hidden'); }, 3500);
}

/* ─────────────────────────────────────────────────────────
   State object LB
───────────────────────────────────────────────────────── */
const LB = {
  testId:         null,
  title:          '',
  slug:           '',
  source_book:    '',
  time_limit:     30,
  category:       'academic',
  is_published:   false,
  has_transcript: false,

  // Fixed 4 parts — never added/removed
  parts: [
    { part_number: 1, audio_url: '', transcript: '' },
    { part_number: 2, audio_url: '', transcript: '' },
    { part_number: 3, audio_url: '', transcript: '' },
    { part_number: 4, audio_url: '', transcript: '' },
  ],

  // [{id, part_number, type, instructions, constraint, context_html,
  //   limit, image_url,
  //   questions:[{id,number,text,answer,acceptable_answers,answer_location,
  //               options,explanation}]}]
  groups: [],

  // UI state
  _activeTab:        'basic',
  _activePartNumber: 1,
  _editingGroupId:   null,
  _addingToGroupId:  null,
  _editingQId:       null,

  // Snapshot for Discard
  _basicSnapshot: null,
};

/* ─────────────────────────────────────────────────────────
   Completion types (share context_html rendering)
───────────────────────────────────────────────────────── */
const COMPLETION_TYPES = ['form_completion', 'note_completion', 'sentence_completion'];

/* ─────────────────────────────────────────────────────────
   Load existing test (edit mode)
───────────────────────────────────────────────────────── */
function loadFromTestData(test) {
  LB.testId         = test.id;
  LB.title          = test.title          || '';
  LB.slug           = test.slug           || '';
  LB.source_book    = test.source_book    || '';
  LB.time_limit     = test.time_limit     || 30;
  LB.category       = test.category       || 'academic';
  LB.is_published   = test.is_published   || false;
  LB.has_transcript = test.has_transcript || false;

  const data = test.test_json || {};

  (data.parts || []).forEach((part, idx) => {
    const partIdx = (part.part_number || (idx + 1)) - 1;
    if (partIdx < 0 || partIdx > 3) return;
    LB.parts[partIdx].audio_url  = part.audio_url  || '';
    LB.parts[partIdx].transcript = part.transcript || '';

    (part.question_groups || []).forEach(group => {
      LB.groups.push({
        id:           group.group_id || uid(),
        part_number:  part.part_number || (idx + 1),
        type:         group.type || 'form_completion',
        instructions: group.instructions || '',
        constraint:   group.constraint   || '',
        context_html: group.context_html || '',
        limit:        group.limit        || 2,
        image_url:    group.image_url    || '',
        questions:    (group.questions || []).map(q => ({
          id:                uid(),
          number:            q.number,
          text:              q.text               || '',
          answer:            Array.isArray(q.answer) ? q.answer : (q.answer || ''),
          acceptable_answers: q.acceptable_answers || [],
          answer_location:   q.answer_location    || '',
          options:           q.options            || null,
          explanation:       q.explanation        || '',
        })),
        option_pool:  (group.option_pool || []).map(o => ({ letter: o.letter || '', text: o.text || '' })),
        allow_reuse:  group.allow_reuse  || false,
      });
    });
  });
}

/* ─────────────────────────────────────────────────────────
   Build test_json from state (for save)
───────────────────────────────────────────────────────── */
function buildTestJson() {
  const parts = LB.parts.map(part => {
    const partGroups = LB.groups
      .filter(g => g.part_number === part.part_number);

    const question_groups = partGroups.map(group => {
      const qs = group.questions.slice().sort((a, b) => a.number - b.number);

      const groupJson = {
        group_id:     group.id,
        type:         group.type,
        instructions: group.instructions,
        questions: qs.map(q => {
          const qObj = {
            number:            q.number,
            answer:            q.answer,
            explanation:       q.explanation,
            acceptable_answers: q.acceptable_answers,
            answer_location:   q.answer_location,
          };
          if (q.text)    qObj.text    = q.text;
          if (q.options) qObj.options = q.options;
          return qObj;
        }),
      };

      if (group.constraint)   groupJson.constraint   = group.constraint;
      if (group.context_html) groupJson.context_html = group.context_html;
      if (group.type === 'mcq_multiple') groupJson.limit = group.limit;
      if (group.type === 'map_labelling' && group.image_url) groupJson.image_url = group.image_url;
      if (group.type === 'matching_information' || group.type === 'drag_drop_matching') {
        groupJson.option_pool = group.option_pool || [];
        groupJson.allow_reuse = group.allow_reuse || false;
      }

      return groupJson;
    });

    const partJson = {
      part_number:     part.part_number,
      audio_url:       part.audio_url,
      question_groups,
    };

    // Only include transcript if has_transcript is enabled
    if (LB.has_transcript && part.transcript) {
      partJson.transcript = part.transcript;
    }

    return partJson;
  });

  return { parts };
}

function _countTotalQuestions() {
  return LB.groups.reduce((sum, g) => sum + g.questions.length, 0);
}

/* ─────────────────────────────────────────────────────────
   Publish toggle
───────────────────────────────────────────────────────── */
function _syncPublishBtn() {
  const btn   = document.getElementById('publishToggleBtn');
  const label = document.getElementById('publishBtnLabel');
  if (!btn) return;
  btn.disabled = !LB.testId;
  btn.classList.toggle('is-published', LB.is_published);
  label.textContent = LB.is_published ? 'Unpublish' : 'Publish';
  btn.title = LB.testId ? '' : 'Save the test first';
}

async function togglePublish() {
  if (!LB.testId) return;
  try {
    const res  = await fetch(`/admin/listening/${LB.testId}/publish`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Toggle failed');
    LB.is_published = json.is_published;
    const sel = document.getElementById('testStatus');
    if (sel) sel.value = LB.is_published ? 'published' : 'draft';
    _syncHeaderTitle();
    _syncPublishBtn();
    showToast(
      LB.is_published ? 'Test published — students can now see it.' : 'Test unpublished.',
      LB.is_published ? 'success' : 'info'
    );
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Save test (POST or PUT)
───────────────────────────────────────────────────────── */
async function saveTest() {
  if (!LB.title.trim()) { showToast('Title is required.', 'error'); switchTab('basic'); return; }
  if (!LB.slug.trim())  { showToast('Slug is required.',  'error'); switchTab('basic'); return; }

  const payload = {
    title:           LB.title.trim(),
    slug:            LB.slug.trim(),
    source_book:     LB.source_book.trim(),
    category:        LB.category,
    time_limit:      LB.time_limit,
    is_published:    LB.is_published,
    has_transcript:  LB.has_transcript,
    total_questions: _countTotalQuestions(),
    test_json:       buildTestJson(),
  };

  const isNew  = !LB.testId;
  const url    = isNew ? '/admin/listening/save' : `/admin/listening/${LB.testId}`;
  const method = isNew ? 'POST' : 'PUT';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Save failed');

    if (isNew) {
      LB.testId = json.test_id;
      history.replaceState({}, '', `/admin/listening/${LB.testId}/edit`);
    }
    showToast('Test saved successfully.', 'success');
    _syncHeaderTitle();
    _syncPublishBtn();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Tab switching
───────────────────────────────────────────────────────── */
function switchTab(name) {
  LB._activeTab = name;
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${name}`);
  });
  if (name === 'audio')     renderPartsGrid();
  if (name === 'questions') renderQuestionArea();
}

/* ─────────────────────────────────────────────────────────
   Basic tab — sync UI ↔ state
───────────────────────────────────────────────────────── */
function syncBasicToUI() {
  document.getElementById('testTitle').value      = LB.title;
  document.getElementById('testSlug').value       = LB.slug;
  document.getElementById('testSourceBook').value = LB.source_book;
  document.getElementById('testTime').value       = LB.time_limit;
  document.getElementById('testCategory').value   = LB.category;
  document.getElementById('testStatus').value     = LB.is_published ? 'published' : 'draft';
  document.getElementById('hasTranscriptToggle').checked = LB.has_transcript;
  _syncHeaderTitle();
}

function syncBasicFromUI() {
  LB.title          = document.getElementById('testTitle').value.trim();
  LB.slug           = document.getElementById('testSlug').value.trim();
  LB.source_book    = document.getElementById('testSourceBook').value.trim();
  LB.time_limit     = parseInt(document.getElementById('testTime').value) || 30;
  LB.category       = document.getElementById('testCategory').value;
  LB.is_published   = document.getElementById('testStatus').value === 'published';
  LB.has_transcript = document.getElementById('hasTranscriptToggle').checked;
}

function _syncHeaderTitle() {
  const titleEl = document.getElementById('headerTitle');
  const badgeEl = document.getElementById('statusBadge');
  if (titleEl) titleEl.textContent = LB.title || 'New Listening Test';
  if (badgeEl) {
    badgeEl.textContent = LB.is_published ? 'Published' : 'Draft';
    badgeEl.className   = `status-badge ${LB.is_published ? 'published' : 'draft'}`;
  }
}

function _snapshotBasic() {
  LB._basicSnapshot = {
    title: LB.title, slug: LB.slug, source_book: LB.source_book,
    time_limit: LB.time_limit, category: LB.category,
    is_published: LB.is_published, has_transcript: LB.has_transcript,
  };
}

function _restoreBasicSnapshot() {
  if (!LB._basicSnapshot) return;
  Object.assign(LB, LB._basicSnapshot);
  syncBasicToUI();
}

/* ─────────────────────────────────────────────────────────
   Audio & Transcript Tab (Tab 2)
───────────────────────────────────────────────────────── */
function renderPartsGrid() {
  const grid = document.getElementById('partsGrid');
  if (!grid) return;

  grid.innerHTML = LB.parts.map(part => {
    const hasAudio = !!part.audio_url;
    const qCount   = LB.groups
      .filter(g => g.part_number === part.part_number)
      .reduce((s, g) => s + g.questions.length, 0);

    const fileName = hasAudio
      ? part.audio_url.split('/').pop()
      : '';

    return `
    <div class="part-card" id="part-card-${part.part_number}">
      <div class="part-card-header">
        <div class="part-number-badge">P${part.part_number}</div>
        <div class="part-card-title">Part ${part.part_number}</div>
        ${qCount ? `<span class="part-q-count">${qCount} Q</span>` : ''}
      </div>
      <div class="part-card-body">

        <!-- Audio upload zone -->
        <input type="file" id="audioFile-${part.part_number}" accept=".mp3,.wav,.ogg,.m4a" style="display:none"
          onchange="handleAudioFileChange(${part.part_number}, this)">

        <div class="audio-upload-zone ${hasAudio ? 'has-audio' : ''}"
             id="audioZone-${part.part_number}"
             onclick="document.getElementById('audioFile-${part.part_number}').click()">
          <div class="audio-zone-icon">
            ${hasAudio
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
            }
          </div>
          ${hasAudio
            ? `<div class="audio-zone-label" style="color:#10b981">Audio uploaded ✓</div>
               <div class="audio-filename">${esc(fileName)}</div>`
            : `<div class="audio-zone-label">Upload Audio File</div>
               <div class="audio-zone-sublabel">Click to browse — .mp3, .wav supported</div>`
          }
        </div>

        ${hasAudio ? `
        <audio class="audio-preview-player" id="audioPlayer-${part.part_number}" controls>
          <source src="${esc(part.audio_url)}" type="audio/mpeg">
        </audio>
        <div class="audio-actions">
          <button class="btn btn-secondary btn-sm"
            onclick="document.getElementById('audioFile-${part.part_number}').click()">
            Replace
          </button>
          <button class="btn btn-danger btn-sm"
            onclick="removeAudio(${part.part_number})">
            Remove
          </button>
        </div>` : ''}

        <!-- Transcript (shown only when has_transcript is on) -->
        ${LB.has_transcript ? `
        <div class="transcript-section" id="transcript-${part.part_number}">
          <div class="transcript-header">
            <span class="transcript-label">Transcript (optional)</span>
          </div>
          <textarea class="transcript-textarea"
            id="transcriptTA-${part.part_number}"
            placeholder="Paste or type the full transcript for Part ${part.part_number}..."
            oninput="handleTranscriptInput(${part.part_number}, this)"
          >${esc(part.transcript)}</textarea>
          <div class="transcript-char-count" id="transcriptCount-${part.part_number}">
            ${part.transcript.length} chars
          </div>
        </div>` : ''}

      </div>
    </div>`;
  }).join('');
}

async function handleAudioFileChange(partNumber, inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('audio', file);

  const zone = document.getElementById(`audioZone-${partNumber}`);
  if (zone) {
    zone.style.opacity = '0.5';
    zone.querySelector('.audio-zone-label').textContent = 'Uploading…';
  }

  try {
    const res  = await fetch('/admin/listening/upload-audio', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');

    LB.parts[partNumber - 1].audio_url = json.url;
    showToast(`Part ${partNumber} audio uploaded.`, 'success');
    renderPartsGrid();
  } catch (err) {
    showToast(err.message, 'error');
    if (zone) zone.style.opacity = '1';
  }
}

function removeAudio(partNumber) {
  if (!confirm(`Remove audio for Part ${partNumber}?`)) return;
  LB.parts[partNumber - 1].audio_url = '';
  renderPartsGrid();
  showToast(`Part ${partNumber} audio removed.`, 'info');
}

function handleTranscriptInput(partNumber, ta) {
  LB.parts[partNumber - 1].transcript = ta.value;
  const countEl = document.getElementById(`transcriptCount-${partNumber}`);
  if (countEl) countEl.textContent = `${ta.value.length} chars`;
}

/* ─────────────────────────────────────────────────────────
   Questions Tab (Tab 3)
───────────────────────────────────────────────────────── */
function renderQuestionArea() {
  _syncPartTabs();

  const area = document.getElementById('questionArea');
  if (!area) return;

  const partNum = LB._activePartNumber;
  const part    = LB.parts[partNum - 1];
  const groups  = LB.groups.filter(g => g.part_number === partNum);

  // ── Transcript markup panel ──────────────────────────────
  const transcriptHtml = _buildTranscriptMarkupPanel(partNum, part);

  // ── Group list (or empty state) ──────────────────────────
  let groupsHtml;
  if (!groups.length) {
    groupsHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>No question groups for Part ${partNum}</h3>
        <p>Click "+ Add Question Group" to add your first group.</p>
      </div>`;
  } else {
    groupsHtml = `<div class="group-list">${groups.map(renderGroupCard).join('')}</div>`;
  }

  area.innerHTML = transcriptHtml + groupsHtml;

  // Bind events after render
  _bindTranscriptMarkupEvents(partNum);
  _updateTranscriptPreview(partNum);
}

/* ─────────────────────────────────────────────────────────
   Transcript Markup Panel
───────────────────────────────────────────────────────── */
function _buildTranscriptMarkupPanel(partNum, part) {
  const transcript = part ? (part.transcript || '') : '';
  const hasTranscript = transcript.trim().length > 0;

  return `
  <div class="tm-panel" id="tmPanel-${partNum}">
    <div class="tm-panel-header">
      <div class="tm-panel-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Transcript — Part ${partNum}
        <span class="tm-syntax-hint">Select text → <strong>Mark Answer</strong> to tag question numbers</span>
      </div>
      <div class="tm-panel-actions">
        <button class="btn btn-secondary btn-sm" id="tmMarkBtn-${partNum}" onclick="_markTranscriptSelection(${partNum})">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 20 7-7-4-4-7 7v4h4z"/><path d="M15 5 19 9"/></svg>
          Mark Answer
        </button>
        <button class="tm-toggle-btn" id="tmToggleBtn-${partNum}" onclick="_toggleTmPreview(${partNum})" title="Toggle preview">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
      </div>
    </div>
    <div class="tm-body" id="tmBody-${partNum}">
      <div class="tm-col tm-col-edit">
        <div class="tm-col-label">✏️ Edit markup</div>
        <textarea
          class="tm-markup-textarea"
          id="tmMarkup-${partNum}"
          placeholder="Paste transcript here (from Tab 2)…
Then select text → click Mark Answer to tag question locations.

Example:
GREG: {{This job is in Fordham}}[[2]]
JULIE: Great, not too far away."
          oninput="_onTmInput(${partNum}, this)"
          spellcheck="false"
        >${esc(transcript)}</textarea>
        <div class="tm-footer-hint">Syntax: <code>{{answer text}}[[Q number]]</code></div>
      </div>
      <!-- Shared sync-scroll track -->
      <div class="tm-scroll-track" id="tmScrollTrack-${partNum}">
        <div class="tm-scroll-thumb" id="tmScrollThumb-${partNum}"></div>
      </div>
      <div class="tm-col tm-col-preview">
        <div class="tm-col-label">👁 Preview</div>
        <div class="tm-preview-panel" id="tmPreview-${partNum}">
          ${hasTranscript ? '' : '<span class="tm-preview-empty">Preview will appear here…</span>'}
        </div>
      </div>
    </div>
    <!-- Mini-modal for question number input -->
    <div class="tm-qnum-picker hidden" id="tmQnumPicker-${partNum}">
      <span class="tm-qnum-label">Tag question #</span>
      <input type="number" class="tm-qnum-input" id="tmQnumInput-${partNum}" min="1" max="40" placeholder="e.g. 1">
      <button class="btn btn-primary btn-sm" onclick="_applyTranscriptMark(${partNum})">Apply</button>
      <button class="btn btn-secondary btn-sm" onclick="_cancelTranscriptMark(${partNum})">Cancel</button>
    </div>
  </div>`;
}

function _onTmInput(partNum, ta) {
  LB.parts[partNum - 1].transcript = ta.value;
  _updateTranscriptPreview(partNum);
}

// Store selection range while the number picker is open
const _tmPending = {};

function _markTranscriptSelection(partNum) {
  const ta = document.getElementById(`tmMarkup-${partNum}`);
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  if (start === end) {
    showToast('Select some transcript text first, then click Mark Answer.', 'info');
    return;
  }
  _tmPending[partNum] = { start, end };
  const picker = document.getElementById(`tmQnumPicker-${partNum}`);
  if (picker) {
    picker.classList.remove('hidden');
    const inp = document.getElementById(`tmQnumInput-${partNum}`);
    if (inp) { inp.value = ''; inp.focus(); }
  }
}

function _applyTranscriptMark(partNum) {
  const pending = _tmPending[partNum];
  if (!pending) return;
  const inp = document.getElementById(`tmQnumInput-${partNum}`);
  const qNum = parseInt(inp ? inp.value : '');
  if (!qNum || qNum < 1) { showToast('Enter a valid question number.', 'error'); return; }

  const ta = document.getElementById(`tmMarkup-${partNum}`);
  if (!ta) return;

  const text  = ta.value;
  const sel   = text.slice(pending.start, pending.end);
  const marked = `{{${sel}}}[[${qNum}]]`;
  const newText = text.slice(0, pending.start) + marked + text.slice(pending.end);

  ta.value = newText;
  LB.parts[partNum - 1].transcript = newText;
  _updateTranscriptPreview(partNum);
  _cancelTranscriptMark(partNum);
  showToast(`Q${qNum} answer location marked.`, 'success');
}

function _cancelTranscriptMark(partNum) {
  delete _tmPending[partNum];
  const picker = document.getElementById(`tmQnumPicker-${partNum}`);
  if (picker) picker.classList.add('hidden');
}

function _updateTranscriptPreview(partNum) {
  const preview = document.getElementById(`tmPreview-${partNum}`);
  if (!preview) return;

  const ta = document.getElementById(`tmMarkup-${partNum}`);
  const raw = ta ? ta.value : (LB.parts[partNum - 1]?.transcript || '');

  if (!raw.trim()) {
    preview.innerHTML = '<span class="tm-preview-empty">Preview will appear here…</span>';
    return;
  }

  // Parse {{text}}[[N]] markers
  // Regex: {{(content)}}[[N]] — greedy inside {{}}
  let html = '';
  let lastIndex = 0;
  const re = /\{\{(.*?)\}\}\[\[(\d+)\]\]/gs;
  let m;
  while ((m = re.exec(raw)) !== null) {
    // Text before this match
    if (m.index > lastIndex) {
      html += _tmEscapeText(raw.slice(lastIndex, m.index));
    }
    // Highlighted span
    html += `<span class="tm-highlight">${ _tmEscapeText(m[1]) }<span class="tm-qbubble">${esc(m[2])}</span></span>`;
    lastIndex = re.lastIndex;
  }
  // Remaining text
  if (lastIndex < raw.length) {
    html += _tmEscapeText(raw.slice(lastIndex));
  }

  preview.innerHTML = html;
}

function _tmEscapeText(str) {
  // Escape HTML then restore newlines as <br>
  return esc(str).replace(/\n/g, '<br>');
}

function _toggleTmPreview(partNum) {
  const panel = document.getElementById(`tmPanel-${partNum}`);
  if (panel) panel.classList.toggle('tm-preview-only');
}

function _bindTranscriptMarkupEvents(partNum) {
  // Allow pressing Enter in qnum picker to apply
  const inp = document.getElementById(`tmQnumInput-${partNum}`);
  if (inp) {
    inp.onkeydown = (e) => { if (e.key === 'Enter') _applyTranscriptMark(partNum); };
  }
  // Set up the shared sync-scroll bar
  _initSyncScroll(partNum);
}

function _initSyncScroll(partNum) {
  const ta      = document.getElementById(`tmMarkup-${partNum}`);
  const preview = document.getElementById(`tmPreview-${partNum}`);
  const track   = document.getElementById(`tmScrollTrack-${partNum}`);
  const thumb   = document.getElementById(`tmScrollThumb-${partNum}`);
  if (!ta || !preview || !track || !thumb) return;

  // Recompute thumb size and position
  function _updateThumb() {
    const trackH = track.clientHeight;
    // Use textarea as the scroll source (usually longer)
    const contentH = Math.max(ta.scrollHeight, preview.scrollHeight);
    const viewH    = ta.clientHeight;
    if (contentH <= viewH) { thumb.style.display = 'none'; return; }
    thumb.style.display = '';
    const ratio   = viewH / contentH;
    const thumbH  = Math.max(30, trackH * ratio);
    const scrollRatio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1);
    const maxThumbTop = trackH - thumbH;
    thumb.style.height = thumbH + 'px';
    thumb.style.top    = (scrollRatio * maxThumbTop) + 'px';
  }

  // Scroll both panes to a given 0–1 ratio
  function _scrollTo(ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    ta.scrollTop      = ratio * (ta.scrollHeight      - ta.clientHeight);
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    _updateThumb();
  }

  // Wheel on either pane scrolls both
  function _onWheel(e) {
    e.preventDefault();
    ta.scrollTop += e.deltaY;
    const maxScroll = ta.scrollHeight - ta.clientHeight;
    const ratio = maxScroll > 0 ? ta.scrollTop / maxScroll : 0;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    _updateThumb();
  }
  ta.addEventListener('wheel',      _onWheel, { passive: false });
  preview.addEventListener('wheel', _onWheel, { passive: false });

  // Drag thumb
  let _dragging = false;
  let _dragStartY = 0;
  let _dragStartTop = 0;

  thumb.addEventListener('mousedown', (e) => {
    _dragging = true;
    _dragStartY   = e.clientY;
    _dragStartTop = parseFloat(thumb.style.top) || 0;
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!_dragging) return;
    const trackH = track.clientHeight;
    const thumbH = thumb.clientHeight;
    const newTop = Math.max(0, Math.min(trackH - thumbH,
                            _dragStartTop + (e.clientY - _dragStartY)));
    const ratio  = trackH > thumbH ? newTop / (trackH - thumbH) : 0;
    _scrollTo(ratio);
  });

  window.addEventListener('mouseup', () => {
    if (_dragging) { _dragging = false; document.body.style.userSelect = ''; }
  });

  // Click on track background (not thumb)
  track.addEventListener('click', (e) => {
    if (e.target === thumb) return;
    const rect  = track.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / track.clientHeight;
    _scrollTo(ratio);
  });

  // Keep thumb size updated when content changes
  new ResizeObserver(_updateThumb).observe(track);
  new MutationObserver(_updateThumb).observe(preview, { childList: true, subtree: true });

  _updateThumb();
}

function _syncPartTabs() {
  document.querySelectorAll('.part-selector-tab').forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.part) === LB._activePartNumber);
  });
}

/* ─────────────────────────────────────────────────────────
   Group Card render
───────────────────────────────────────────────────────── */
function renderGroupCard(group) {
  const typeLabel = _groupTypeLabel(group.type);
  const qs        = group.questions.slice().sort((a, b) => a.number - b.number);

  const qRows = qs.map(q => {
    const answerDisplay = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
    return `
    <div class="question-row">
      <div class="q-number-badge">${q.number}</div>
      <div class="q-stem">${esc(q.text || '(blank fill)')}</div>
      <div class="q-answer-tag">${esc(answerDisplay)}</div>
      <div class="q-row-actions">
        <button class="btn-icon" title="Edit question" onclick="openEditQuestionModal('${group.id}','${q.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon danger" title="Delete question" onclick="deleteQuestion('${group.id}','${q.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');

  // Extras block
  let extrasHtml = '';
  if (COMPLETION_TYPES.includes(group.type) && group.context_html) {
    const excerpt = group.context_html.replace(/<[^>]+>/g, '').slice(0, 120);
    extrasHtml += `<div class="group-context-preview"><em>Context:</em> ${esc(excerpt)}${group.context_html.length > 120 ? '…' : ''}</div>`;
  }
  if (group.constraint) {
    extrasHtml += `<div class="group-constraint-tag">Limit: ${esc(group.constraint)}</div>`;
  }
  if (group.type === 'mcq_multiple') {
    extrasHtml += `<div class="group-limit-tag">Choose ${group.limit}</div>`;
  }
  if (group.type === 'matching_information' && group.option_pool?.length) {
    const chips = group.option_pool.map(o =>
      `<span class="pool-chip"><strong>${esc(o.letter)}</strong>${o.text ? ' ' + esc(o.text) : ''}</span>`
    ).join('');
    extrasHtml += `<div style="margin-bottom:6px"><div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Options (${group.option_pool.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div></div>`;
    if (group.allow_reuse) {
      extrasHtml += `<div class="group-constraint-tag" style="background:rgba(16,185,129,.12);color:#10b981">Reuse allowed</div>`;
    }
  }
  if (group.type === 'drag_drop_matching' && group.option_pool?.length) {
    const chips = group.option_pool.map(o =>
      `<span class="pool-chip ddm-chip"><strong>${esc(o.letter)}</strong>${o.text ? ' ' + esc(o.text) : ''}</span>`
    ).join('');
    extrasHtml += `<div style="margin-bottom:6px"><div style="font-size:.75rem;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Drop Options (${group.option_pool.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div></div>`;
    if (group.allow_reuse) {
      extrasHtml += `<div class="group-constraint-tag" style="background:rgba(124,58,237,.1);color:#7c3aed">Reuse allowed</div>`;
    }
  }
  if (group.type === 'map_labelling' && group.image_url) {
    extrasHtml += `<div class="group-context-preview"><em>Map image:</em> ${esc(group.image_url.split('/').pop())}</div>`;
  }

  return `
  <div class="group-card" id="group-${group.id}">
    <div class="group-card-header">
      <span class="group-type-badge${group.type === 'drag_drop_matching' ? ' ddm' : ''}">${esc(typeLabel)}</span>
      <span class="group-card-title">
        ${qs.length ? `Questions ${qs[0].number}–${qs[qs.length-1].number}` : 'No questions yet'}
      </span>
      <div class="group-card-actions">
        <button class="btn-icon" title="Edit group config" onclick="openEditGroupModal('${group.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="btn-icon danger" title="Delete group" onclick="deleteGroup('${group.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="group-card-body">
      ${group.instructions ? `<div class="group-instructions">"${esc(group.instructions)}"</div>` : ''}
      ${extrasHtml}
      ${qs.length ? `<div class="question-rows">${qRows}</div>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="openAddQuestionModal('${group.id}')">
        + Add Question
      </button>
    </div>
  </div>`;
}

function _groupTypeLabel(type) {
  const labels = {
    form_completion:     'Form / Table Completion',
    note_completion:     'Note / Bullet Completion',
    sentence_completion: 'Sentence Completion',
    matching_information:'Matching Information',
    drag_drop_matching:  'Drag & Drop Matching',
    mcq_single:          'Multiple Choice (Choose ONE)',
    mcq_multiple:        'Multiple Choice (Choose TWO/THREE)',
    map_labelling:       'Map / Plan Labelling',
  };
  return labels[type] || type;
}

/* ─────────────────────────────────────────────────────────
   Add Group dropdown
───────────────────────────────────────────────────────── */
function toggleAddGroupMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById('addGroupMenu');
  if (menu) menu.classList.toggle('hidden');
}

/* ─────────────────────────────────────────────────────────
   Group Config Modal
───────────────────────────────────────────────────────── */
function openGroupModal(type, groupId) {
  const menu = document.getElementById('addGroupMenu');
  if (menu) menu.classList.add('hidden');

  LB._editingGroupId = groupId || null;

  // Matching Information and Drag & Drop Matching share the same MI modal
  if (type === 'matching_information' || type === 'drag_drop_matching') {
    _openMIModal(groupId, type);
    return;
  }

  const titles = {
    form_completion:     'Form / Table Completion Group',
    note_completion:     'Note / Bullet Completion Group',
    sentence_completion: 'Sentence Completion Group',
    mcq_single:          'Multiple Choice Group (Choose ONE)',
    mcq_multiple:        'Multiple Choice Group (Choose TWO/THREE)',
    map_labelling:       'Map / Plan Labelling Group',
  };

  document.getElementById('gcModalTitle').textContent =
    (groupId ? 'Edit ' : 'Add ') + (titles[type] || type);
  document.getElementById('gcType').value    = type;
  document.getElementById('gcGroupId').value = groupId || '';

  const isCompletion = COMPLETION_TYPES.includes(type);
  const isMcq        = type === 'mcq_multiple' || type === 'mcq_single';
  const isMcqMulti   = type === 'mcq_multiple';
  const isMap        = type === 'map_labelling';

  // Show/hide relevant fields
  document.getElementById('gcConstraintGroup').style.display  = (isCompletion || isMap) ? '' : 'none';
  document.getElementById('gcContextHtmlGroup').style.display = isCompletion ? '' : 'none';
  document.getElementById('gcLimitGroup').style.display       = isMcqMulti ? '' : 'none';
  document.getElementById('gcMapImageGroup').style.display    = isMap ? '' : 'none';

  // Pre-fill for edit mode
  if (groupId) {
    const g = LB.groups.find(x => x.id === groupId);
    if (g) {
      document.getElementById('gcInstructions').value = g.instructions || '';
      document.getElementById('gcConstraint').value   = g.constraint   || '';
      document.getElementById('gcContextHtml').value  = g.context_html || '';
      if (isMcqMulti) {
        document.getElementById('gcLimit').value = g.limit || 2;
      }
      if (isMap && g.image_url) {
        document.getElementById('gcMapImageUrl').value = g.image_url;
        document.getElementById('gcMapImageStatus').textContent = g.image_url.split('/').pop();
        const preview = document.getElementById('gcMapImagePreview');
        const img     = document.getElementById('gcMapImagePreviewImg');
        if (preview && img) { img.src = g.image_url; preview.style.display = 'block'; }
      }
    }
  } else {
    // Clear fields
    document.getElementById('gcInstructions').value = '';
    document.getElementById('gcConstraint').value   = '';
    document.getElementById('gcContextHtml').value  = '';
    document.getElementById('gcMapImageUrl').value  = '';
    document.getElementById('gcMapImageStatus').textContent = '';
    const preview = document.getElementById('gcMapImagePreview');
    if (preview) preview.style.display = 'none';
    if (isMcqMulti) document.getElementById('gcLimit').value = 2;
  }

  openModal('groupConfigModal');
}

function openEditGroupModal(groupId) {
  LB._editingGroupId = groupId;
  const g = LB.groups.find(x => x.id === groupId);
  if (!g) return;
  openGroupModal(g.type, groupId);
}

function saveGroupConfig() {
  const type         = document.getElementById('gcType').value;
  const instructions = document.getElementById('gcInstructions').value.trim();
  const constraint   = document.getElementById('gcConstraint').value.trim();
  const context_html = document.getElementById('gcContextHtml').value.trim();
  const limit        = parseInt(document.getElementById('gcLimit').value) || 2;
  const image_url    = document.getElementById('gcMapImageUrl').value.trim();

  if (!instructions) { showToast('Instructions are required.', 'error'); return; }
  if (COMPLETION_TYPES.includes(type) && !context_html) {
    showToast('Context HTML is required for completion types.', 'error');
    return;
  }
  if (type === 'map_labelling' && !image_url && !LB._editingGroupId) {
    // Image is optional on edit, but warn if missing on create
    // Allow saving without image — admin can add later
  }

  if (LB._editingGroupId) {
    const g = LB.groups.find(x => x.id === LB._editingGroupId);
    if (g) {
      g.instructions = instructions;
      g.constraint   = constraint;
      g.context_html = context_html;
      g.limit        = limit;
      g.image_url    = image_url;
    }
  } else {
    LB.groups.push({
      id:           uid(),
      part_number:  LB._activePartNumber,
      type,
      instructions,
      constraint,
      context_html,
      limit,
      image_url,
      questions:    [],
    });
  }

  closeModal('groupConfigModal');
  renderQuestionArea();
  showToast(LB._editingGroupId ? 'Group updated.' : 'Group added.', 'success');
}

function deleteGroup(groupId) {
  const g = LB.groups.find(x => x.id === groupId);
  if (!g) return;
  const msg = g.questions.length
    ? `This group has ${g.questions.length} question(s). Delete it?`
    : 'Delete this question group?';
  if (!confirm(msg)) return;
  LB.groups = LB.groups.filter(x => x.id !== groupId);
  renderQuestionArea();
  showToast('Group deleted.', 'info');
}

/* ─────────────────────────────────────────────────────────
   Matching Information Modal
───────────────────────────────────────────────────────── */
function _openMIModal(groupId, forceType) {
  const titleEl = document.getElementById('miModalTitle');
  const instrTA = document.getElementById('miInstructions');
  const reuseCB = document.getElementById('miAllowReuse');
  const listEl  = document.getElementById('miOptionsList');

  // Store what type we're actually creating (MI or DDM)
  LB._miModalType = forceType || 'matching_information';
  if (!forceType && groupId) {
    // Editing — derive from the existing group
    const g = LB.groups.find(x => x.id === groupId);
    LB._miModalType = g ? g.type : 'matching_information';
  }

  const isDDM = LB._miModalType === 'drag_drop_matching';

  listEl.innerHTML = '';

  if (groupId) {
    const g = LB.groups.find(x => x.id === groupId);
    if (!g) return;
    titleEl.textContent = isDDM ? 'Edit Drag & Drop Matching Group' : 'Edit Matching Information Group';
    instrTA.value       = g.instructions || '';
    reuseCB.checked     = g.allow_reuse  || false;
    (g.option_pool || []).forEach(o => _appendMIOptionRow(o.text || ''));
  } else {
    if (isDDM) {
      titleEl.textContent = 'Add Drag & Drop Matching Group';
      instrTA.value       = 'What information does the speaker give about each of the following?\nChoose SIX answers from the box and write the correct letter, A–H, next to Questions.';
      reuseCB.checked     = false;
      for (let i = 0; i < 8; i++) _appendMIOptionRow('');
    } else {
      titleEl.textContent = 'Add Matching Information Group';
      instrTA.value       = 'Which section (A–E) contains the following information?\nWrite the correct letter, A–E, next to questions.';
      reuseCB.checked     = true;
      for (let i = 0; i < 5; i++) _appendMIOptionRow('');
    }
  }
  openModal('matchingInfoModal');
}

function _appendMIOptionRow(text) {
  const list   = document.getElementById('miOptionsList');
  const letter = LETTERS[list.children.length] || String(list.children.length + 1);
  const row    = document.createElement('div');
  row.className = 'mcq-option-row';
  row.innerHTML = `
    <span class="mcq-option-letter">${letter}</span>
    <input type="text" class="form-input mcq-option-input" value="${esc(text)}"
      placeholder="Section ${letter} label or description (optional)">
    <button type="button" class="btn-icon danger" onclick="removeMIOptionRow(this)" title="Remove">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  list.appendChild(row);
}

function removeMIOptionRow(btn) {
  const list = document.getElementById('miOptionsList');
  if (list.children.length <= 2) { showToast('Minimum 2 options required.', 'error'); return; }
  btn.closest('.mcq-option-row').remove();
  _reindexMIRows();
}

function _reindexMIRows() {
  const rows = document.querySelectorAll('#miOptionsList .mcq-option-row');
  rows.forEach((row, i) => {
    const letter = LETTERS[i] || String(i + 1);
    row.querySelector('.mcq-option-letter').textContent = letter;
    row.querySelector('.mcq-option-input').placeholder  = `Section ${letter} label or description (optional)`;
  });
}

function saveMIGroup() {
  const instructions = document.getElementById('miInstructions').value.trim();
  const allow_reuse  = document.getElementById('miAllowReuse').checked;
  if (!instructions) { showToast('Instructions are required.', 'error'); return; }

  const rows = document.querySelectorAll('#miOptionsList .mcq-option-row');
  if (rows.length < 2) { showToast('At least 2 options required.', 'error'); return; }

  const option_pool = Array.from(rows).map((row, i) => ({
    letter: LETTERS[i] || String(i + 1),
    text:   row.querySelector('.mcq-option-input').value.trim(),
  }));

  // Determine actual type (MI or DDM)
  const groupType = LB._miModalType || 'matching_information';

  if (LB._editingGroupId) {
    const g = LB.groups.find(x => x.id === LB._editingGroupId);
    if (g) {
      g.instructions = instructions;
      g.allow_reuse  = allow_reuse;
      g.option_pool  = option_pool;
      // Preserve existing type on edit
    }
  } else {
    LB.groups.push({
      id:           uid(),
      part_number:  LB._activePartNumber,
      type:         groupType,
      instructions,
      constraint:   '',
      context_html: '',
      limit:        2,
      image_url:    '',
      option_pool,
      allow_reuse,
      questions:    [],
    });
  }

  closeModal('matchingInfoModal');
  renderQuestionArea();
  showToast(LB._editingGroupId ? 'Group updated.' : 'Group added.', 'success');
}

function openAddQuestionModal(groupId) {
  LB._addingToGroupId = groupId;
  LB._editingQId      = null;

  const group = LB.groups.find(x => x.id === groupId);
  if (!group) return;

  // Next question number: max existing + 1 (or 1 if empty)
  const maxNum = group.questions.reduce((m, q) => Math.max(m, q.number), 0);

  _configureQuestionModal(group, null, maxNum + 1);
  document.getElementById('questionModalTitle').textContent = 'Add Question';
  document.getElementById('saveQuestionBtn').textContent    = 'Add Question';
  openModal('questionModal');
}

function openEditQuestionModal(groupId, qId) {
  LB._addingToGroupId = groupId;
  LB._editingQId      = qId;

  const group = LB.groups.find(x => x.id === groupId);
  if (!group) return;
  const q = group.questions.find(x => x.id === qId);
  if (!q) return;

  _configureQuestionModal(group, q, q.number);
  document.getElementById('questionModalTitle').textContent = 'Edit Question';
  document.getElementById('saveQuestionBtn').textContent    = 'Save Changes';
  openModal('questionModal');
}

function _configureQuestionModal(group, q, defaultNumber) {
  const type = group.type;

  // Reset all optional sections
  document.getElementById('qStemGroup').style.display             = '';
  document.getElementById('qMcqOptions').style.display            = 'none';
  document.getElementById('qMcqAnswerGroup').style.display        = 'none';
  document.getElementById('qMcqSingleAnswerGroup').style.display  = 'none';
  document.getElementById('qMIAnswerGroup').style.display         = 'none';
  document.getElementById('qMapAnswerGroup').style.display        = 'none';
  document.getElementById('qAnswerTextGroup').style.display       = 'none';
  document.getElementById('qAcceptableGroup').style.display       = 'none';
  document.getElementById('qAnswerLocationGroup').style.display   = 'none';

  // Set question number
  document.getElementById('qNumber').value = q ? q.number : defaultNumber;
  document.getElementById('qExplanation').value = q ? (q.explanation || '') : '';
  // answer_location is now embedded in transcript markup - no separate field

  // Type-specific configuration
  if (type === 'matching_information' || type === 'drag_drop_matching') {
    document.getElementById('qStemGroup').style.display     = '';
    document.getElementById('qMIAnswerGroup').style.display = '';

    const isDDM = type === 'drag_drop_matching';
    document.getElementById('qStemLabel').textContent = isDDM ? 'Item Label *' : 'Statement / Question *';
    document.getElementById('qStemHint').textContent  = isDDM
      ? 'The item the student drags an answer onto (e.g. "Four Seasons").'
      : 'The statement that students match to a section letter.';
    document.getElementById('qStem').value       = q ? (q.text || '') : '';
    document.getElementById('qStem').placeholder = isDDM
      ? 'e.g. Four Seasons'
      : 'e.g. A description of problems caused by a particular species';

    // Populate answer select from this group’s option pool
    const select = document.getElementById('qMIAnswer');
    select.innerHTML = '<option value="">— select —</option>';
    (group.option_pool || []).forEach(o => {
      const opt = document.createElement('option');
      opt.value       = o.letter;
      opt.textContent = o.text ? `${o.letter} — ${o.text}` : o.letter;
      if (q && q.answer === o.letter) opt.selected = true;
      select.appendChild(opt);
    });

  } else if (type === 'mcq_single') {
    document.getElementById('qStemGroup').style.display             = '';
    document.getElementById('qMcqOptions').style.display            = '';
    document.getElementById('qMcqSingleAnswerGroup').style.display  = '';

    document.getElementById('qStemLabel').textContent = 'Question Stem *';
    document.getElementById('qStemHint').textContent  = 'The question students read before seeing the options.';
    document.getElementById('qStem').value  = q ? (q.text || '') : '';
    document.getElementById('qStem').placeholder = 'Which of the following best describes...?';

    const optionsList = document.getElementById('qMcqOptionsList');
    optionsList.innerHTML = '';
    const existingOptions = q ? (q.options || []) : [];
    const defaultCount    = existingOptions.length || 4;
    for (let i = 0; i < defaultCount; i++) {
      _appendMcqOptionRow(existingOptions[i]?.text || '');
    }
    _syncMcqSingleAnswerRadios(q ? q.answer : '');

  } else if (type === 'mcq_multiple') {
    document.getElementById('qStemGroup').style.display      = '';
    document.getElementById('qMcqOptions').style.display     = '';
    document.getElementById('qMcqAnswerGroup').style.display = '';

    document.getElementById('qStemLabel').textContent = 'Question Stem *';
    document.getElementById('qStemHint').textContent  = 'The question students read before seeing the options.';
    document.getElementById('qStem').value  = q ? (q.text || '') : '';
    document.getElementById('qStem').placeholder = 'Which TWO things did the speaker mention...?';

    // Build MCQ options
    const optionsList = document.getElementById('qMcqOptionsList');
    optionsList.innerHTML = '';
    const existingOptions = q ? (q.options || []) : [];
    const defaultCount    = existingOptions.length || 4;
    for (let i = 0; i < defaultCount; i++) {
      _appendMcqOptionRow(existingOptions[i]?.text || '');
    }
    _syncMcqAnswerChecks(q ? q.answer : []);

    document.getElementById('qMcqAnswerLabel').textContent =
      `Correct Answers * (select exactly ${group.limit})`;

  } else if (type === 'map_labelling') {
    document.getElementById('qStemGroup').style.display    = '';
    document.getElementById('qMapAnswerGroup').style.display = '';

    document.getElementById('qStemLabel').textContent = 'Location Label *';
    document.getElementById('qStemHint').textContent  = 'The feature name students must locate on the map (e.g. "Conference center").';
    document.getElementById('qStem').value  = q ? (q.text || '') : '';
    document.getElementById('qStem').placeholder = 'e.g. Conference center';
    document.getElementById('qMapAnswer').value = q ? (q.answer || '') : '';
    document.getElementById('qAcceptableGroup').style.display = 'none';

  } else {
    // All completion types: stem hidden (blanks are in context_html), text answer shown
    document.getElementById('qStemGroup').style.display    = 'none';
    document.getElementById('qAnswerTextGroup').style.display = '';
    document.getElementById('qAcceptableGroup').style.display = '';

    document.getElementById('qAnswerTextLabel').textContent = 'Correct Answer *';
    document.getElementById('qAnswerTextHint').textContent  =
      'Exact text that fills this blank. Case-insensitive.';
    document.getElementById('qAnswerText').value  = q ? (q.answer || '') : '';
    document.getElementById('qAnswerText').placeholder = 'e.g. Kings';

    const acceptableList = (q && q.acceptable_answers) ? q.acceptable_answers.join(', ') : '';
    document.getElementById('qAcceptable').value = acceptableList;
  }
}

/* ── MCQ option row helpers ──────────────────────────────── */
const LETTERS = ['A','B','C','D','E','F','G','H'];

function _appendMcqOptionRow(value) {
  const list  = document.getElementById('qMcqOptionsList');
  const index = list.children.length;
  if (index >= 8) return;
  const letter = LETTERS[index];
  const row    = document.createElement('div');
  row.className = 'mcq-option-row';
  row.innerHTML = `
    <span class="mcq-option-letter">${letter}</span>
    <input type="text" class="form-input mcq-option-input" value="${esc(value)}"
      placeholder="Option ${letter} text">
    <button type="button" class="btn-icon danger" onclick="removeMcqOptionRow(this)"
      title="Remove">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  list.appendChild(row);
  _syncMcqAnswerChecks();
  _syncMcqSingleAnswerRadios();
}

function removeMcqOptionRow(btn) {
  const list = document.getElementById('qMcqOptionsList');
  if (list.children.length <= 2) { showToast('Minimum 2 options required.', 'error'); return; }
  btn.closest('.mcq-option-row').remove();
  _reindexMcqOptions();
  _syncMcqAnswerChecks();
  _syncMcqSingleAnswerRadios();
}

function _reindexMcqOptions() {
  const rows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
  rows.forEach((row, i) => {
    const letter = LETTERS[i] || String(i + 1);
    row.querySelector('.mcq-option-letter').textContent = letter;
    row.querySelector('.mcq-option-input').placeholder  = `Option ${letter} text`;
  });
}

function _syncMcqAnswerChecks(currentAnswers) {
  const container = document.getElementById('qMcqAnswerChecks');
  if (!container) return;
  const rows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
  const currentSet = new Set(
    Array.isArray(currentAnswers) ? currentAnswers.map(a => String(a).toUpperCase()) : []
  );
  container.innerHTML = '';
  rows.forEach((row, i) => {
    const letter = LETTERS[i] || String(i + 1);
    const label  = document.createElement('label');
    label.className = 'checkbox-inline';
    label.style.marginBottom = '6px';
    label.innerHTML = `
      <input type="checkbox" name="mcqAnswer" value="${letter}" ${currentSet.has(letter) ? 'checked' : ''}>
      <span>${letter}. <span class="mcq-check-text">${esc(row.querySelector('.mcq-option-input').value)}</span></span>`;
    container.appendChild(label);
  });
}

function _syncMcqSingleAnswerRadios(currentAnswer) {
  const container = document.getElementById('qMcqSingleAnswerRadios');
  if (!container) return;
  const rows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
  const current = String(currentAnswer || '').toUpperCase();
  container.innerHTML = '';
  rows.forEach((row, i) => {
    const letter = LETTERS[i] || String(i + 1);
    const label  = document.createElement('label');
    label.className = 'checkbox-inline';
    label.style.marginBottom = '6px';
    label.innerHTML = `
      <input type="radio" name="mcqSingleAnswer" value="${letter}" ${current === letter ? 'checked' : ''}>
      <span>${letter}. <span class="mcq-single-text">${esc(row.querySelector('.mcq-option-input').value)}</span></span>`;
    container.appendChild(label);
  });
}


function saveQuestion() {
  const groupId = LB._addingToGroupId;
  const group   = LB.groups.find(x => x.id === groupId);
  if (!group) return;

  const type       = group.type;
  const number     = parseInt(document.getElementById('qNumber').value);
  const explanation = document.getElementById('qExplanation').value.trim();
  // answer_location is now embedded in the transcript markup ({{...}}[[N]]) - not stored per question

  if (!number || number < 1) { showToast('Valid question number required.', 'error'); return; }

  let qData = {
    id:                LB._editingQId || uid(),
    number,
    text:              '',
    answer:            '',
    acceptable_answers: [],
    options:           null,
    explanation,
  };

  if (type === 'matching_information' || type === 'drag_drop_matching') {
    const stem   = document.getElementById('qStem').value.trim();
    const letter = document.getElementById('qMIAnswer').value;
    const label  = type === 'drag_drop_matching' ? 'Item label' : 'Statement';
    if (!stem)   { showToast(`${label} is required.`, 'error'); return; }
    if (!letter) { showToast('Select the correct option letter.', 'error'); return; }
    qData.text   = stem;
    qData.answer = letter;

  } else if (type === 'mcq_single') {
    const stem = document.getElementById('qStem').value.trim();
    if (!stem) { showToast('Question stem is required.', 'error'); return; }
    qData.text = stem;

    // Collect options
    const optRows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
    const options = [];
    optRows.forEach((row, i) => {
      const text = row.querySelector('.mcq-option-input').value.trim();
      if (text) options.push({ letter: LETTERS[i], text });
    });
    if (options.length < 2) { showToast('At least 2 options required.', 'error'); return; }
    qData.options = options;

    // Single selected radio
    const selected = document.querySelector('#qMcqSingleAnswerRadios input[name="mcqSingleAnswer"]:checked');
    if (!selected) { showToast('Select the correct answer.', 'error'); return; }
    qData.answer = selected.value;   // stored as plain string e.g. "B"

  } else if (type === 'mcq_multiple') {
    const stem    = document.getElementById('qStem').value.trim();
    if (!stem) { showToast('Question stem is required.', 'error'); return; }
    qData.text = stem;

    // Collect options
    const optRows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
    const options = [];
    optRows.forEach((row, i) => {
      const text = row.querySelector('.mcq-option-input').value.trim();
      if (text) options.push({ letter: LETTERS[i], text });
    });
    if (options.length < 2) { showToast('At least 2 options required.', 'error'); return; }
    qData.options = options;

    // Collect checked answers
    const checked = Array.from(document.querySelectorAll('#qMcqAnswerChecks input[name="mcqAnswer"]:checked'))
      .map(cb => cb.value);
    if (!checked.length) { showToast('Select at least one correct answer.', 'error'); return; }
    qData.answer = checked;

  } else if (type === 'map_labelling') {
    const stem   = document.getElementById('qStem').value.trim();
    const letter = document.getElementById('qMapAnswer').value;
    if (!stem)   { showToast('Location label is required.', 'error'); return; }
    if (!letter) { showToast('Correct letter is required.', 'error'); return; }
    qData.text   = stem;
    qData.answer = letter;

  } else {
    // Completion types
    const answer = document.getElementById('qAnswerText').value.trim();
    if (!answer) { showToast('Correct answer is required.', 'error'); return; }
    qData.answer = answer;

    const acceptableRaw = document.getElementById('qAcceptable').value.trim();
    qData.acceptable_answers = acceptableRaw
      ? acceptableRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  if (LB._editingQId) {
    const idx = group.questions.findIndex(x => x.id === LB._editingQId);
    if (idx !== -1) group.questions[idx] = qData;
  } else {
    group.questions.push(qData);
  }

  closeModal('questionModal');
  renderQuestionArea();
  showToast(LB._editingQId ? 'Question updated.' : 'Question added.', 'success');
}

function deleteQuestion(groupId, qId) {
  if (!confirm('Delete this question?')) return;
  const group = LB.groups.find(x => x.id === groupId);
  if (!group) return;
  group.questions = group.questions.filter(x => x.id !== qId);
  renderQuestionArea();
  showToast('Question deleted.', 'info');
}

/* ─────────────────────────────────────────────────────────
   Map image upload (in group modal)
───────────────────────────────────────────────────────── */
async function handleMapImageChange(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const statusEl = document.getElementById('gcMapImageStatus');
  statusEl.textContent = 'Uploading…';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res  = await fetch('/admin/listening/upload-image', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');

    document.getElementById('gcMapImageUrl').value = json.url;
    statusEl.textContent = json.url.split('/').pop();

    const preview = document.getElementById('gcMapImagePreview');
    const img     = document.getElementById('gcMapImagePreviewImg');
    img.src = json.url;
    preview.style.display = 'block';
    showToast('Map image uploaded.', 'success');
  } catch (err) {
    statusEl.textContent = '';
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Modal helpers
───────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────
   Event wiring
───────────────────────────────────────────────────────── */
function bindEvents() {
  // Tab navigation
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      syncBasicFromUI();
      switchTab(btn.dataset.tab);
    });
  });

  // Part selector tabs
  document.querySelectorAll('.part-selector-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      LB._activePartNumber = parseInt(tab.dataset.part);
      renderQuestionArea();
    });
  });

  // Save/Publish buttons in header
  document.getElementById('saveBtn')?.addEventListener('click', () => {
    syncBasicFromUI();
    saveTest();
  });
  document.getElementById('publishToggleBtn')?.addEventListener('click', togglePublish);

  // Basic tab save/discard
  document.getElementById('saveBasicBtn')?.addEventListener('click', () => {
    syncBasicFromUI();
    showToast('Basic info saved.', 'success');
    _syncHeaderTitle();
  });
  document.getElementById('discardBasicBtn')?.addEventListener('click', () => {
    _restoreBasicSnapshot();
    showToast('Changes discarded.', 'info');
  });

  // Time stepper
  document.getElementById('timePlus')?.addEventListener('click', () => {
    const inp = document.getElementById('testTime');
    inp.value = Math.min(180, parseInt(inp.value || 30) + 5);
  });
  document.getElementById('timeMinus')?.addEventListener('click', () => {
    const inp = document.getElementById('testTime');
    inp.value = Math.max(1, parseInt(inp.value || 30) - 5);
  });

  // Auto-slug from title
  document.getElementById('testTitle')?.addEventListener('input', e => {
    const slugInput = document.getElementById('testSlug');
    if (!LB.testId && slugInput && !slugInput.dataset.manuallyEdited) {
      slugInput.value = toSlug(e.target.value);
    }
  });
  document.getElementById('testSlug')?.addEventListener('input', function() {
    this.dataset.manuallyEdited = '1';
    this.value = toSlug(this.value);
  });

  // has_transcript toggle: re-render audio tab if open
  document.getElementById('hasTranscriptToggle')?.addEventListener('change', function() {
    LB.has_transcript = this.checked;
    if (LB._activeTab === 'audio') renderPartsGrid();
    // Reveal/hide answer location in question modal
    const locGroup = document.getElementById('qAnswerLocationGroup');
    if (locGroup && !document.getElementById('questionModal').classList.contains('hidden')) {
      locGroup.style.display = this.checked ? '' : 'none';
    }
  });

  // Modal close buttons (data-close attribute)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Group config save (completion + map types)
  document.getElementById('saveGroupConfigBtn')?.addEventListener('click', saveGroupConfig);

  // Matching Information group save
  document.getElementById('saveMIGroupBtn')?.addEventListener('click', saveMIGroup);
  document.getElementById('miAddOptionBtn')?.addEventListener('click', () => {
    const list = document.getElementById('miOptionsList');
    if (list.children.length >= 8) { showToast('Maximum 8 options.', 'error'); return; }
    _appendMIOptionRow('');
  });

  // Question modal save
  document.getElementById('saveQuestionBtn')?.addEventListener('click', saveQuestion);

  // MCQ: Add option button
  document.getElementById('qAddMcqOptionBtn')?.addEventListener('click', () => {
    const list = document.getElementById('qMcqOptionsList');
    if (list.children.length >= 8) { showToast('Maximum 8 options.', 'error'); return; }
    _appendMcqOptionRow('');
    _syncMcqAnswerChecks();
  });

  // Sync MCQ answer checkboxes/radios when option text changes
  document.getElementById('qMcqOptionsList')?.addEventListener('input', () => {
    const rows    = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
    const checks  = document.querySelectorAll('#qMcqAnswerChecks .mcq-check-text');
    const radios  = document.querySelectorAll('#qMcqSingleAnswerRadios .mcq-single-text');
    rows.forEach((row, i) => {
      const text = row.querySelector('.mcq-option-input').value;
      if (checks[i]) checks[i].textContent = text;
      if (radios[i]) radios[i].textContent = text;
    });
  });

  // Map image upload
  document.getElementById('gcMapImageUploadBtn')?.addEventListener('click', () => {
    document.getElementById('gcMapImageFile').click();
  });
  document.getElementById('gcMapImageFile')?.addEventListener('change', function() {
    handleMapImageChange(this);
  });

  // Close add-group dropdown on outside click
  document.addEventListener('click', e => {
    const menu = document.getElementById('addGroupMenu');
    if (menu && !menu.classList.contains('hidden')) {
      if (!document.getElementById('addGroupWrapper')?.contains(e.target)) {
        menu.classList.add('hidden');
      }
    }
  });
}

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Load existing test data if in edit mode
  if (window.BUILDER_DATA) {
    loadFromTestData(window.BUILDER_DATA);
  }

  bindEvents();
  syncBasicToUI();
  _snapshotBasic();
  _syncPublishBtn();
});
