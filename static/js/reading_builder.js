/**
 * reading_builder.js — ScoreMate Reading Quiz Builder
 *
 * Manages state for: basic settings, passages, and question groups.
 * Phase 1 question type: matching_headings (Select / Roman numeral dropdown).
 *
 * Data flow:
 *   window.BUILDER_DATA → loadFromTestData() → B (state) → renderAll()
 *   saveTest() → buildTestJson() → POST /admin/reading/save
 *                              or PUT  /admin/reading/<id>
 */

/* ─────────────────────────────────────────────────────────
   Roman numeral helpers
───────────────────────────────────────────────────────── */
const ROMAN = ['','i','ii','iii','iv','v','vi','vii','viii','ix','x',
               'xi','xii','xiii','xiv','xv','xvi'];

function toRoman(n) { return ROMAN[n] || String(n); }

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

function countPassageWords(content) {
  return content.trim().split(/\s+/).filter(Boolean).length;
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
   State
───────────────────────────────────────────────────────── */
const B = {
  testId:       null,
  title:        '',
  slug:         '',
  description:  '',
  time_limit:   60,
  category:     'academic',
  is_published: false,

  // [{id, title, content, order}]
  passages: [],

  // [{id, passage_id, type, instructions, option_pool:[{text}], allow_reuse, constraint, context_html,
  //   questions:[{id,number,text,answer,options,explanation}]}]
  groups: [],

  // UI-only
  _activeTab:        'basic',
  _activePassageId:  null,   // which passage is selected in Questions tab
  _editingPassageId: null,   // null = adding new passage
  _editingGroupId:   null,   // null = adding new group
  _addingToGroupId:  null,   // group we're adding a question to
  _editingQId:       null,   // question being edited (null = new)

  // Snapshots for "Discard" on basic tab
  _basicSnapshot:    null,
};

/* ─────────────────────────────────────────────────────────
   Load existing test data (edit mode)
───────────────────────────────────────────────────────── */
function loadFromTestData(test) {
  B.testId       = test.id;
  B.title        = test.title        || '';
  B.slug         = test.slug         || '';
  B.description  = test.description  || '';
  B.time_limit   = test.time_limit   || 60;
  B.category     = test.category     || 'academic';
  B.is_published = test.is_published || false;

  const data = test.test_json || {};

  (data.parts || []).forEach((part, partIdx) => {
    const passageId = uid();

    // Flatten all paragraphs back to plain text
    const paragraphs = [];
    (part.passage?.sections || []).forEach(sec => {
      (sec.paragraphs || []).forEach(p => paragraphs.push(p));
    });

    B.passages.push({
      id:      passageId,
      title:   part.passage?.title || `Part ${partIdx + 1}`,
      content: paragraphs.join('\n\n'),
      order:   partIdx + 1,
    });

    (part.question_groups || []).forEach(group => {
      B.groups.push({
        id:           group.group_id || uid(),
        passage_id:   passageId,
        type:         group.type || 'matching_headings',
        instructions: group.instructions || '',
        option_pool:  (group.option_pool || []).map(o => ({ text: o.text || '' })),
        allow_reuse:  group.allow_reuse  || false,
        constraint:   group.constraint   || '',
        context_html: group.context_html || '',
        questions:    (group.questions || []).map(q => ({
          id:          uid(),
          number:      q.number,
          text:        q.text    || '',
          answer:      q.answer  || '',
          options:     q.options    || null,
          image_url:   q.image_url  || null,
          explanation: q.explanation || '',
        })),
      });
    });
  });
}

/* ─────────────────────────────────────────────────────────
   Build test_json from state (for save)
───────────────────────────────────────────────────────── */
function buildTestJson() {
  const parts = B.passages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((passage, idx) => {
      const paragraphs = passage.content
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(Boolean);

      const passageGroups = B.groups
        .filter(g => g.passage_id === passage.id);

      const question_groups = passageGroups.map(group => {
        const qs = group.questions.slice().sort((a, b) => a.number - b.number);
        const nums = qs.map(q => q.number);
        const qRange = nums.length
          ? `${Math.min(...nums)}-${Math.max(...nums)}`
          : '';

        const groupJson = {
          group_id:       group.id,
          type:           group.type,
          question_range: qRange,
          instructions:   group.instructions,
          questions: qs.map(q => {
            const qObj = {
              number:      q.number,
              text:        q.text,
              answer:      q.answer,
              explanation: q.explanation,
            };
            if (q.options)    qObj.options   = q.options;
            if (q.image_url)  qObj.image_url = q.image_url;
            return qObj;
          }),
        };
        if (group.type === 'matching_headings') {
          groupJson.option_pool_label = 'List of Headings';
          groupJson.option_pool  = group.option_pool;
          groupJson.allow_reuse  = group.allow_reuse;
        } else if (group.type === 'matching_information') {
          groupJson.option_pool  = group.option_pool;
          groupJson.allow_reuse  = group.allow_reuse;
        }
        if (group.constraint)   groupJson.constraint   = group.constraint;
        if (group.context_html) groupJson.context_html = group.context_html;
        return groupJson;
      });

      return {
        part_number:     idx + 1,
        passage:         { title: passage.title, sections: [{ paragraphs }] },
        question_groups,
      };
    });

  return { parts };
}

function _countTotalQuestions() {
  return B.groups.reduce((sum, g) => sum + g.questions.length, 0);
}

/* ─────────────────────────────────────────────────────────
   Publish toggle
───────────────────────────────────────────────────────── */
function _syncPublishBtn() {
  const btn   = document.getElementById('publishToggleBtn');
  const label = document.getElementById('publishBtnLabel');
  if (!btn) return;
  btn.disabled = !B.testId;
  btn.classList.toggle('is-published', B.is_published);
  label.textContent = B.is_published ? 'Unpublish' : 'Publish';
  btn.title = B.testId ? '' : 'Save the test first';
}

async function togglePublish() {
  if (!B.testId) return;
  try {
    const res  = await fetch(`/admin/reading/${B.testId}/publish`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Toggle failed');
    B.is_published = json.is_published;
    // Keep status dropdown in sync
    const sel = document.getElementById('testStatus');
    if (sel) sel.value = B.is_published ? 'published' : 'draft';
    _syncHeaderTitle();
    _syncPublishBtn();
    showToast(B.is_published ? 'Test published — students can now see it.' : 'Test unpublished.', B.is_published ? 'success' : 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   API calls
───────────────────────────────────────────────────────── */
async function saveTest() {
  if (!B.title.trim()) { showToast('Title is required.', 'error'); switchTab('basic'); return; }
  if (!B.slug.trim())  { showToast('Slug is required.',  'error'); switchTab('basic'); return; }

  const payload = {
    title:           B.title.trim(),
    slug:            B.slug.trim(),
    category:        B.category,
    time_limit:      B.time_limit,
    is_published:    B.is_published,
    total_questions: _countTotalQuestions(),
    test_json:       buildTestJson(),
  };

  const isNew = !B.testId;
  const url    = isNew ? '/admin/reading/save' : `/admin/reading/${B.testId}`;
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
      B.testId = json.test_id;
      // Update the browser URL without reload
      history.replaceState({}, '', `/admin/reading/${B.testId}/edit`);
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
  B._activeTab = name;
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${name}`);
  });
  if (name === 'passages')  renderPassages();
  if (name === 'questions') renderQuestionArea();
}

/* ─────────────────────────────────────────────────────────
   Basic Edit tab — sync UI ↔ state
───────────────────────────────────────────────────────── */
function syncBasicToUI() {
  document.getElementById('testTitle').value       = B.title;
  document.getElementById('testSlug').value        = B.slug;
  document.getElementById('testDescription').value = B.description;
  document.getElementById('testTime').value        = B.time_limit;
  document.getElementById('testCategory').value    = B.category;
  document.getElementById('testStatus').value      = B.is_published ? 'published' : 'draft';
  _syncHeaderTitle();
}

function syncBasicFromUI() {
  B.title        = document.getElementById('testTitle').value.trim();
  B.slug         = document.getElementById('testSlug').value.trim();
  B.description  = document.getElementById('testDescription').value.trim();
  B.time_limit   = parseInt(document.getElementById('testTime').value) || 60;
  B.category     = document.getElementById('testCategory').value;
  B.is_published = document.getElementById('testStatus').value === 'published';
}

function _syncHeaderTitle() {
  const titleEl  = document.getElementById('headerTitle');
  const badgeEl  = document.getElementById('statusBadge');
  if (titleEl) titleEl.textContent = B.title || 'New Reading Test';
  if (badgeEl) {
    badgeEl.textContent  = B.is_published ? 'Published' : 'Draft';
    badgeEl.className    = `status-badge ${B.is_published ? 'published' : 'draft'}`;
  }
}

function _snapshotBasic() {
  B._basicSnapshot = {
    title: B.title, slug: B.slug, description: B.description,
    time_limit: B.time_limit, category: B.category, is_published: B.is_published,
  };
}

function _restoreBasicSnapshot() {
  if (!B._basicSnapshot) return;
  Object.assign(B, B._basicSnapshot);
  syncBasicToUI();
}

/* ─────────────────────────────────────────────────────────
   Passages tab
───────────────────────────────────────────────────────── */
function renderPassages() {
  const container = document.getElementById('passageList');
  if (!container) return;

  if (!B.passages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <h3>0 Passages</h3>
        <p>Click 'Add Passage' to add your first reading passage.</p>
        <button class="btn btn-primary" onclick="openPassageModal()">+ Add Passage</button>
      </div>`;
    return;
  }

  container.innerHTML = B.passages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(p => {
      const wordCount = countPassageWords(p.content);
      const qCount = B.groups.filter(g => g.passage_id === p.id)
                              .reduce((s, g) => s + g.questions.length, 0);
      return `
        <div class="passage-card">
          <div class="passage-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="passage-card-body">
            <div class="passage-card-title">${esc(p.title)}</div>
            <div class="passage-card-meta">Order: ${p.order} &nbsp;·&nbsp; ${wordCount} words &nbsp;·&nbsp; ${qCount} questions</div>
          </div>
          <div class="passage-card-actions">
            <button class="btn-icon" title="Edit passage" onclick="openPassageModal('${p.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon danger" title="Delete passage" onclick="deletePassage('${p.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');
}

/* ── Passage modal ──────────────────────────────────────── */
function openPassageModal(passageId) {
  B._editingPassageId = passageId || null;
  const modalTitle = document.getElementById('passageModalTitle');
  const saveBtn    = document.getElementById('savePassageBtn');
  const titleInput = document.getElementById('passageTitleInput');
  const contentTA  = document.getElementById('passageContentInput');

  if (passageId) {
    const p = B.passages.find(x => x.id === passageId);
    if (!p) return;
    modalTitle.textContent   = 'Edit Reading Passage';
    saveBtn.textContent      = 'Save Changes';
    titleInput.value         = p.title;
    contentTA.value          = p.content;
  } else {
    modalTitle.textContent = 'Add Reading Passage';
    saveBtn.textContent    = 'Add Passage';
    titleInput.value       = '';
    contentTA.value        = '';
  }
  openModal('passageModal');
}

function savePassage() {
  const title   = document.getElementById('passageTitleInput').value.trim();
  const content = document.getElementById('passageContentInput').value.trim();

  if (!title)   { showToast('Passage title is required.', 'error'); return; }
  if (!content) { showToast('Passage content is required.', 'error'); return; }

  if (B._editingPassageId) {
    const p = B.passages.find(x => x.id === B._editingPassageId);
    if (p) { p.title = title; p.content = content; }
  } else {
    B.passages.push({
      id:      uid(),
      title,
      content,
      order:   B.passages.length + 1,
    });
  }

  closeModal('passageModal');
  renderPassages();
  _syncPassageSelector();
  showToast(B._editingPassageId ? 'Passage updated.' : 'Passage added.', 'success');
}

function deletePassage(passageId) {
  const groupCount = B.groups.filter(g => g.passage_id === passageId).length;
  const msg = groupCount
    ? `This passage has ${groupCount} question group(s). Deleting it will also remove all its questions. Continue?`
    : 'Delete this passage?';
  if (!confirm(msg)) return;

  B.passages = B.passages.filter(p => p.id !== passageId);
  B.groups   = B.groups.filter(g => g.passage_id !== passageId);
  // Re-assign order
  B.passages.forEach((p, i) => { p.order = i + 1; });
  renderPassages();
  _syncPassageSelector();
  if (B._activePassageId === passageId) {
    B._activePassageId = null;
    renderQuestionArea();
  }
  showToast('Passage deleted.', 'info');
}

/* ─────────────────────────────────────────────────────────
   Questions tab
───────────────────────────────────────────────────────── */
function _syncPassageSelector() {
  const sel = document.getElementById('passageSelector');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— SELECT PASSAGE —</option>';
  B.passages
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      if (p.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  // Restore active or clear
  if (B._activePassageId && B.passages.find(p => p.id === B._activePassageId)) {
    sel.value = B._activePassageId;
  }
}

function renderQuestionArea() {
  _syncPassageSelector();
  const area       = document.getElementById('questionArea');
  const addWrapper = document.getElementById('addGroupWrapper');
  if (!area) return;

  if (!B._activePassageId) {
    if (addWrapper) addWrapper.style.display = 'none';
    area.innerHTML = `
      <div class="choose-passage-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>Select a passage above to view and add questions.</p>
        ${!B.passages.length ? '<p style="font-size:.8rem;margin:0">No passages yet — create one in the <strong>Passages</strong> tab first.</p>' : ''}
      </div>`;
    return;
  }

  if (addWrapper) addWrapper.style.display = '';

  const groups = B.groups.filter(g => g.passage_id === B._activePassageId);

  if (!groups.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>No questions yet</h3>
        <p>Click '+ Add Question' to add your first question group.</p>
      </div>`;
    return;
  }

  area.innerHTML = `<div class="group-list">${groups.map(renderGroupCard).join('')}</div>`;
}

function renderGroupCard(group) {
  const typeLabel = _groupTypeLabel(group.type);
  const qs = group.questions.slice().sort((a, b) => a.number - b.number);

  const qRows = qs.map(q => `
    <div class="question-row">
      <div class="q-number-badge">${q.number}</div>
      <div class="q-stem">${esc(q.text || (group.type === 'sentence_completion' ? '(blank fill)' : ''))}</div>
      <div class="q-answer-tag">${esc(q.answer)}</div>
      <div class="q-row-actions">
        <button class="btn-icon" title="Edit question" onclick="openEditQuestionModal('${group.id}','${q.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon danger" title="Delete question" onclick="deleteQuestion('${group.id}','${q.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>`).join('');

  // Type-specific extras block
  let extrasHtml = '';
  if (group.type === 'matching_headings' && group.option_pool.length) {
    const poolHtml = group.option_pool.slice(0, 6).map((o, i) =>
      `<span class="pool-chip"><strong>${toRoman(i+1)}.</strong> ${esc(o.text)}</span>`
    ).join('') + (group.option_pool.length > 6 ? `<span class="pool-chip">+${group.option_pool.length - 6} more</span>` : '');
    extrasHtml = `<div class="pool-preview"><strong>Headings Pool (${group.option_pool.length})</strong><div class="pool-chips">${poolHtml}</div></div>`;
  } else if (group.type === 'sentence_completion' && group.context_html) {
    const excerpt = group.context_html.replace(/<[^>]+>/g, '').slice(0, 120);
    extrasHtml = `<div class="group-context-preview"><em>Context:</em> ${esc(excerpt)}${group.context_html.length > 120 ? '…' : ''}</div>`;
  }
  if (group.constraint) {
    extrasHtml += `<div class="group-constraint-tag">Word limit: ${esc(group.constraint)}</div>`;
  }

  return `
    <div class="group-card" id="group-${group.id}">
      <div class="group-card-header">
        <span class="group-type-badge">${esc(typeLabel)}</span>
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
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
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
    matching_headings:          'Matching Headings',
    matching_information:       'Matching Information',
    matching_features:          'Matching Features',
    matching_sentence_endings:  'Sentence Endings',
    tfng:                       'True / False / Not Given',
    ynng:                       'Yes / No / Not Given',

    mcq_single:                 'MCQ Single',
    mcq_choose_2:               'Choose Two',
    mcq_choose_3:               'Choose Three',
    note_completion:            'Note / Bullet Completion',
    summary_completion:         'Summary Completion',
    table_completion:           'Table Completion',
  };
  return labels[type] || type;
}

/* ─────────────────────────────────────────────────────────
   Add Group type-picker dropdown
───────────────────────────────────────────────────────── */
function toggleAddGroupMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById('addGroupMenu');
  if (menu) menu.classList.toggle('hidden');
}

/* ─────────────────────────────────────────────────────────
   Generic group config modal (non-MH types)
───────────────────────────────────────────────────────── */
function openGroupModal(type, groupId) {
  const menu = document.getElementById('addGroupMenu');
  if (menu) menu.classList.add('hidden');

  B._editingGroupId = groupId || null;

  // MH-family types share the pool modal
  if (type === 'matching_headings' || type === 'matching_information') {
    _openMHModal(groupId, type);
    return;
  }

  const isTFNG = type === 'tfng' || type === 'ynng';
  const titles = {
    tfng:                'True/False / Yes/No + Not Given Group',
    ynng:                'True/False / Yes/No + Not Given Group',
    mcq_single:          'Multiple Choice Group',
    sentence_completion: 'Sentence Completion Group',
    note_completion:     'Note / Bullet Completion Group',
    summary_completion:  'Summary / Paragraph Completion Group',
    table_completion:    'Table Completion Group',
    short_answer:        'Short Answer Group',
  };
  document.getElementById('gcModalTitle').textContent =
    (groupId ? 'Edit' : 'Add') + ' ' + (titles[type] || type);
  document.getElementById('gcType').value    = type;
  document.getElementById('gcGroupId').value = groupId || '';

  const completionTypes = ['sentence_completion','note_completion','summary_completion','table_completion'];
  const showConstraint  = [...completionTypes, 'short_answer'].includes(type);
  const showContextHtml = completionTypes.includes(type);
  document.getElementById('gcVariantGroup').style.display    = isTFNG        ? '' : 'none';
  document.getElementById('gcConstraintGroup').style.display = showConstraint  ? '' : 'none';
  document.getElementById('gcContextHtmlGroup').style.display= showContextHtml ? '' : 'none';

  if (groupId) {
    const g = B.groups.find(x => x.id === groupId);
    if (g) {
      // Set correct variant radio
      if (isTFNG) {
        const radio = document.querySelector(`input[name="gcVariant"][value="${g.type}"]`);
        if (radio) radio.checked = true;
      }
      document.getElementById('gcInstructions').value = g.instructions || '';
      document.getElementById('gcConstraint').value   = g.constraint   || '';
      document.getElementById('gcContextHtml').value  = g.context_html || '';
    }
  } else {
    // Default variant radio to tfng
    const defaultRadio = document.querySelector('input[name="gcVariant"][value="tfng"]');
    if (defaultRadio) defaultRadio.checked = true;
    document.getElementById('gcInstructions').value = '';
    document.getElementById('gcConstraint').value   = '';
    document.getElementById('gcContextHtml').value  = '';
  }
  openModal('groupConfigModal');
}

function saveGroupConfig() {
  let   type         = document.getElementById('gcType').value;
  const instructions = document.getElementById('gcInstructions').value.trim();
  const constraint   = document.getElementById('gcConstraint').value.trim();
  const context_html = document.getElementById('gcContextHtml').value.trim();

  // Resolve tfng/ynng from variant radio
  if (type === 'tfng' || type === 'ynng') {
    type = document.querySelector('input[name="gcVariant"]:checked')?.value || 'tfng';
  }

  if (!instructions) { showToast('Instructions are required.', 'error'); return; }
  if (['sentence_completion','note_completion','summary_completion','table_completion'].includes(type) && !context_html) {
    showToast('Context HTML is required for this completion type.', 'error');
    return;
  }

  if (B._editingGroupId) {
    const g = B.groups.find(x => x.id === B._editingGroupId);
    if (g) {
      g.instructions = instructions;
      g.constraint   = constraint;
      g.context_html = context_html;
    }
  } else {
    B.groups.push({
      id:           uid(),
      passage_id:   B._activePassageId,
      type,
      instructions,
      constraint,
      context_html,
      option_pool:  [],
      allow_reuse:  false,
      questions:    [],
    });
  }

  closeModal('groupConfigModal');
  renderQuestionArea();
  showToast(B._editingGroupId ? 'Group updated.' : 'Group added.', 'success');
}

/* ─────────────────────────────────────────────────────────
   Matching Headings group modal
───────────────────────────────────────────────────────── */
function openEditGroupModal(groupId) {
  B._editingGroupId = groupId;
  const g = B.groups.find(x => x.id === groupId);
  if (!g) return;
  if (g.type === 'matching_headings' || g.type === 'matching_information') {
    _openMHModal(groupId, g.type);
  } else {
    // ynng shares the same modal entry as tfng (variant radio selects which)
    openGroupModal(g.type, groupId);
  }
}

function _openMHModal(groupId, type) {
  const titleEl = document.getElementById('mhModalTitle');
  const instrTA = document.getElementById('mhInstructions');
  const reuseCB = document.getElementById('mhAllowReuse');
  const listEl  = document.getElementById('headingInputsList');

  // Resolve type: from existing group (edit), or passed-in (add)
  const resolvedType = groupId
    ? (B.groups.find(x => x.id === groupId)?.type || 'matching_headings')
    : (type || 'matching_headings');
  const isMI = resolvedType === 'matching_information';

  // Stash so saveMHGroup knows which type to create
  B._openingMHType = resolvedType;

  if (groupId) {
    const g = B.groups.find(x => x.id === groupId);
    if (!g) return;
    titleEl.textContent = isMI ? 'Edit Matching Information Group' : 'Edit Matching Headings Group';
    instrTA.value       = g.instructions;
    reuseCB.checked     = g.allow_reuse;
    listEl.innerHTML    = '';
    g.option_pool.forEach((o, i) => _appendHeadingRow(o.text || o.letter || '', i, isMI));
  } else {
    titleEl.textContent = isMI ? 'Add Matching Information Group' : 'Add Matching Headings Group';
    instrTA.value       = isMI
      ? 'The passage has paragraphs A–F. Which paragraph contains the following information? Write the correct letter, A–F.'
      : 'The passage has several paragraphs. Choose the correct heading for each paragraph from the list of headings below.';
    reuseCB.checked     = isMI;  // MI typically allows reuse
    listEl.innerHTML    = '';
    const defaultCount  = isMI ? 6 : 5;
    for (let i = 0; i < defaultCount; i++) _appendHeadingRow('', i, isMI);
  }
  openModal('matchingHeadingsModal');
}

function _appendHeadingRow(value, index, letterMode) {
  const list  = document.getElementById('headingInputsList');
  const total = list.querySelectorAll('.heading-input-row').length;
  const idx   = index !== undefined ? index : total;
  const label = letterMode ? String.fromCharCode(65 + idx) + '.' : toRoman(idx + 1) + '.';
  const ph    = letterMode ? 'Optional paragraph description…' : 'Heading text…';

  const row = document.createElement('div');
  row.className = 'heading-input-row';
  row.dataset.letterMode = letterMode ? '1' : '0';
  row.innerHTML = `
    <span class="heading-roman-label">${label}</span>
    <input type="text" class="form-input heading-text-input" placeholder="${ph}" value="${esc(value)}">
    <button type="button" class="btn-icon danger remove-heading-btn" title="Remove">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  row.querySelector('.remove-heading-btn').addEventListener('click', () => {
    row.remove();
    _reindexHeadingRows();
  });
  list.appendChild(row);
}

function _reindexHeadingRows() {
  document.querySelectorAll('#headingInputsList .heading-input-row').forEach((row, i) => {
    const isLetter = row.dataset.letterMode === '1';
    row.querySelector('.heading-roman-label').textContent =
      isLetter ? String.fromCharCode(65 + i) + '.' : toRoman(i + 1) + '.';
  });
}

function saveMHGroup() {
  const instructions = document.getElementById('mhInstructions').value.trim();
  const allowReuse   = document.getElementById('mhAllowReuse').checked;
  const type         = B._openingMHType || 'matching_headings';
  const isMI         = type === 'matching_information';

  const rows = document.querySelectorAll('#headingInputsList .heading-input-row');
  if (rows.length < 2) {
    showToast('Add at least 2 entries to the pool.', 'error');
    return;
  }

  const pool = Array.from(rows).map((row, i) => {
    const text = row.querySelector('.heading-text-input').value.trim();
    if (isMI) {
      return { letter: String.fromCharCode(65 + i), text };
    }
    return { text };
  });

  if (B._editingGroupId) {
    const g = B.groups.find(x => x.id === B._editingGroupId);
    if (g) {
      g.instructions = instructions;
      g.option_pool  = pool;
      g.allow_reuse  = allowReuse;
    }
  } else {
    B.groups.push({
      id:          uid(),
      passage_id:  B._activePassageId,
      type,
      instructions,
      option_pool: pool,
      allow_reuse: allowReuse,
      constraint:  '',
      context_html:'',
      questions:   [],
    });
  }

  closeModal('matchingHeadingsModal');
  renderQuestionArea();
  showToast(B._editingGroupId ? 'Group updated.' : 'Group added.', 'success');
}

function deleteGroup(groupId) {
  const g = B.groups.find(x => x.id === groupId);
  if (!g) return;
  if (!confirm(`Delete this question group (${g.questions.length} questions)?`)) return;
  B.groups = B.groups.filter(x => x.id !== groupId);
  renderQuestionArea();
  showToast('Group deleted.', 'info');
}

/* ─────────────────────────────────────────────────────────
   Add / Edit Question modal
───────────────────────────────────────────────────────── */
function _nextQNumber() {
  const allNums = B.groups
    .filter(g => g.passage_id === B._activePassageId)
    .flatMap(g => g.questions.map(q => q.number));
  return allNums.length ? Math.max(...allNums) + 1 : 1;
}

/* ─────────────────────────────────────────────────────────
   Dynamic MCQ option rows
───────────────────────────────────────────────────────── */
function _appendMcqOptionRow(value) {
  const list  = document.getElementById('qMcqOptionsList');
  const idx   = list.querySelectorAll('.mcq-option-row').length;
  const label = String.fromCharCode(65 + idx);

  const row = document.createElement('div');
  row.className = 'mcq-option-row';
  row.innerHTML = `
    <span class="mcq-option-letter">${label}.</span>
    <input type="text" class="form-input mcq-option-input" placeholder="Option ${label} text" value="${esc(value)}">
    <button type="button" class="btn-icon danger mcq-option-remove" title="Remove">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  row.querySelector('.mcq-option-remove').addEventListener('click', () => {
    const list2 = document.getElementById('qMcqOptionsList');
    if (list2.querySelectorAll('.mcq-option-row').length <= 2) {
      showToast('Minimum 2 options required.', 'error');
      return;
    }
    row.remove();
    _reindexMcqOptions();
    _syncMcqAnswerDropdown();
  });

  row.querySelector('.mcq-option-input').addEventListener('input', _syncMcqAnswerDropdown);

  list.appendChild(row);
  _syncMcqAnswerDropdown();
}

function _reindexMcqOptions() {
  document.querySelectorAll('#qMcqOptionsList .mcq-option-row').forEach((row, i) => {
    const label = String.fromCharCode(65 + i);
    row.querySelector('.mcq-option-letter').textContent = label + '.';
    row.querySelector('.mcq-option-input').placeholder  = `Option ${label} text`;
  });
}

function _syncMcqAnswerDropdown() {
  const current = document.getElementById('qCorrectAnswer').value;
  const sel     = document.getElementById('qCorrectAnswer');
  const rows    = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
  sel.innerHTML = '<option value="">— select correct option —</option>';
  rows.forEach((_, i) => {
    const letter = String.fromCharCode(65 + i);
    const opt    = document.createElement('option');
    opt.value       = letter;
    opt.textContent = letter;
    if (letter === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function _configureQuestionModal(group, q) {
  const type = group.type;

  const stemGroup      = document.getElementById('qStemGroup');
  const stemLabel      = document.getElementById('qStemLabel');
  const stemInput      = document.getElementById('qStem');
  const stemHint       = document.getElementById('qStemHint');
  const mcqOptions     = document.getElementById('qMcqOptions');
  const answerDropGrp  = document.getElementById('qCorrectAnswerGroup');
  const answerDrop     = document.getElementById('qCorrectAnswer');
  const answerTxtGrp   = document.getElementById('qAnswerTextGroup');
  const answerTxtLabel = document.getElementById('qAnswerTextLabel');
  const answerTxt      = document.getElementById('qAnswerText');
  const answerTxtHint  = document.getElementById('qAnswerTextHint');

  stemInput.value = q ? (q.text || '') : '';
  answerTxt.value = q ? (q.answer || '') : '';

  const opts = q?.options || [];
  ['A','B','C','D'].forEach(l => {
    document.getElementById(`qOpt${l}`).value = opts.find(o => o.letter === l)?.text || '';
  });

  switch (type) {
    case 'matching_headings':
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Paragraph / Item Label *';
      stemHint.textContent     = 'The text the student sees next to the dropdown.';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';
      answerDrop.innerHTML = '<option value="">— select correct heading —</option>';
      group.option_pool.forEach((o, i) => {
        const opt = document.createElement('option');
        opt.value = toRoman(i + 1);
        opt.textContent = `${toRoman(i + 1)}.  ${o.text}`;
        if (opt.value === q?.answer) opt.selected = true;
        answerDrop.appendChild(opt);
      });
      break;

    case 'matching_information':
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Statement *';
      stemHint.textContent     = 'The piece of information the student locates in the passage.';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';
      answerDrop.innerHTML = '<option value="">— select paragraph —</option>';
      group.option_pool.forEach((o, i) => {
        const letter = o.letter || String.fromCharCode(65 + i);
        const opt = document.createElement('option');
        opt.value = letter;
        opt.textContent = o.text ? `${letter}. ${o.text}` : `Paragraph ${letter}`;
        if (opt.value === q?.answer) opt.selected = true;
        answerDrop.appendChild(opt);
      });
      break;

    case 'tfng':
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Statement *';
      stemHint.textContent     = 'The statement the student judges as True, False, or Not Given.';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';
      answerDrop.innerHTML = `
        <option value="">— select answer —</option>
        <option value="TRUE"${q?.answer==='TRUE'?' selected':''}>TRUE</option>
        <option value="FALSE"${q?.answer==='FALSE'?' selected':''}>FALSE</option>
        <option value="NOT GIVEN"${q?.answer==='NOT GIVEN'?' selected':''}>NOT GIVEN</option>`;
      break;

    case 'ynng':
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Statement *';
      stemHint.textContent     = 'The statement the student judges as Yes, No, or Not Given.';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';
      answerDrop.innerHTML = `
        <option value="">— select answer —</option>
        <option value="YES"${q?.answer==='YES'?' selected':''}>YES</option>
        <option value="NO"${q?.answer==='NO'?' selected':''}>NO</option>
        <option value="NOT GIVEN"${q?.answer==='NOT GIVEN'?' selected':''}>NOT GIVEN</option>`;
      break;

    case 'mcq_single': {
      stemGroup.style.display     = '';
      stemLabel.textContent       = 'Question Stem *';
      stemHint.textContent        = 'The question students read before choosing from the options.';
      mcqOptions.style.display    = '';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';

      // Rebuild dynamic options list
      document.getElementById('qMcqOptionsList').innerHTML = '';
      const existingOpts = (q?.options && q.options.length >= 2)
        ? q.options
        : [{letter:'A',text:''},{letter:'B',text:''},{letter:'C',text:''},{letter:'D',text:''}];
      existingOpts.forEach(o => _appendMcqOptionRow(o.text));

      // Pre-select correct answer after rows are built
      if (q?.answer) document.getElementById('qCorrectAnswer').value = q.answer;
      break;
    }

    case 'sentence_completion':
    case 'note_completion':
    case 'summary_completion':
    case 'table_completion':
      stemGroup.style.display     = 'none';
      mcqOptions.style.display    = 'none';
      answerDropGrp.style.display = 'none';
      answerTxtGrp.style.display  = '';
      answerTxtLabel.textContent  = 'Correct Answer (blank fill) *';
      answerTxtHint.textContent   = 'Text that fills the [[N]] blank for this question number.';
      break;

    case 'short_answer':
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Question *';
      stemHint.textContent     = 'The question the student must answer in their own words.';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = 'none';
      answerTxtGrp.style.display  = '';
      answerTxtLabel.textContent  = 'Correct Answer *';
      answerTxtHint.textContent   = 'Exact text matched case-insensitively.';
      break;

    default:
      stemGroup.style.display  = '';
      stemLabel.textContent    = 'Stem *';
      stemHint.textContent     = '';
      mcqOptions.style.display = 'none';
      answerDropGrp.style.display = '';
      answerTxtGrp.style.display  = 'none';
      answerDrop.innerHTML = '<option value="">— select answer —</option>';
  }
}

function _setQuestionImagePreview(url) {
  const urlInput  = document.getElementById('qImageUrl');
  const preview   = document.getElementById('qImagePreview');
  const previewImg = document.getElementById('qImagePreviewImg');
  const status    = document.getElementById('qImageStatus');
  urlInput.value  = url || '';
  if (url) {
    previewImg.src          = url;
    preview.style.display   = 'flex';
    status.textContent      = '';
  } else {
    previewImg.src          = '';
    preview.style.display   = 'none';
    status.textContent      = '';
  }
}

function openAddQuestionModal(groupId) {
  B._addingToGroupId = groupId;
  B._editingQId      = null;

  const group = B.groups.find(x => x.id === groupId);
  if (!group) return;

  document.getElementById('questionModalTitle').textContent = 'Add Question';
  document.getElementById('saveQuestionBtn').textContent    = 'Add Question';
  document.getElementById('qNumber').value                  = _nextQNumber();
  document.getElementById('qExplanation').value             = '';
  _setQuestionImagePreview(null);

  _configureQuestionModal(group, null);
  openModal('questionModal');
}

function openEditQuestionModal(groupId, qId) {
  B._addingToGroupId = groupId;
  B._editingQId      = qId;

  const group = B.groups.find(x => x.id === groupId);
  const q     = group?.questions.find(x => x.id === qId);
  if (!q) return;

  document.getElementById('questionModalTitle').textContent = 'Edit Question';
  document.getElementById('saveQuestionBtn').textContent    = 'Save Changes';
  document.getElementById('qNumber').value                  = q.number;
  document.getElementById('qExplanation').value             = q.explanation;
  _setQuestionImagePreview(q.image_url || null);

  _configureQuestionModal(group, q);
  openModal('questionModal');
}

function saveQuestion() {
  const group = B.groups.find(x => x.id === B._addingToGroupId);
  if (!group) return;

  const number      = parseInt(document.getElementById('qNumber').value);
  const explanation = document.getElementById('qExplanation').value.trim();

  if (!number || number < 1) { showToast('Question number must be ≥ 1.', 'error'); return; }

  const type = group.type;
  let text    = '';
  let answer  = '';
  let options = null;

  if (['sentence_completion','note_completion','summary_completion','table_completion'].includes(type)) {
    answer = document.getElementById('qAnswerText').value.trim();
    if (!answer) { showToast('Correct answer is required.', 'error'); return; }

  } else if (type === 'short_answer') {
    text   = document.getElementById('qStem').value.trim();
    answer = document.getElementById('qAnswerText').value.trim();
    if (!text)   { showToast('Question text is required.', 'error'); return; }
    if (!answer) { showToast('Correct answer is required.', 'error'); return; }

  } else if (type === 'mcq_single') {
    text   = document.getElementById('qStem').value.trim();
    answer = document.getElementById('qCorrectAnswer').value;
    const optRows = document.querySelectorAll('#qMcqOptionsList .mcq-option-row');
    options = Array.from(optRows).map((row, i) => ({
      letter: String.fromCharCode(65 + i),
      text:   row.querySelector('.mcq-option-input').value.trim(),
    }));
    if (!text)                              { showToast('Question stem is required.', 'error'); return; }
    if (options.length < 2)                 { showToast('At least 2 options are required.', 'error'); return; }
    if (options.some(o => !o.text))         { showToast('All options must have text.', 'error'); return; }
    if (!answer)                            { showToast('Please select the correct answer.', 'error'); return; }

  } else {
    text   = document.getElementById('qStem').value.trim();
    answer = document.getElementById('qCorrectAnswer').value;
    if (!text)   { showToast('Question stem is required.', 'error'); return; }
    if (!answer) { showToast('Please select the correct answer.', 'error'); return; }
  }

  const image_url = document.getElementById('qImageUrl').value || null;

  if (B._editingQId) {
    const q = group.questions.find(x => x.id === B._editingQId);
    if (q) { q.number = number; q.text = text; q.answer = answer; q.options = options; q.image_url = image_url; q.explanation = explanation; }
  } else {
    group.questions.push({ id: uid(), number, text, answer, options, image_url, explanation });
  }

  closeModal('questionModal');
  renderQuestionArea();
  showToast(B._editingQId ? 'Question updated.' : 'Question added.', 'success');
}

function deleteQuestion(groupId, qId) {
  if (!confirm('Delete this question?')) return;
  const group = B.groups.find(x => x.id === groupId);
  if (!group) return;
  group.questions = group.questions.filter(x => x.id !== qId);
  renderQuestionArea();
  showToast('Question deleted.', 'info');
}

/* ─────────────────────────────────────────────────────────
   Question image upload
───────────────────────────────────────────────────────── */
async function uploadQuestionImage(file) {
  const status = document.getElementById('qImageStatus');
  status.textContent = 'Uploading…';
  try {
    const form = new FormData();
    form.append('image', file);
    const res  = await fetch('/admin/reading/upload-image', { method: 'POST', body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');
    _setQuestionImagePreview(json.path);
    showToast('Image uploaded.', 'success');
  } catch (err) {
    status.textContent = err.message;
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
   Render all
───────────────────────────────────────────────────────── */
function renderAll() {
  syncBasicToUI();
  _snapshotBasic();
  _syncPublishBtn();
  renderPassages();
  _syncPassageSelector();
  renderQuestionArea();
}

/* ─────────────────────────────────────────────────────────
   Event bindings
───────────────────────────────────────────────────────── */
function bindEvents() {
  // Tab switching
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Unified modal-close for [data-close]
  document.addEventListener('click', e => {
    const closeTarget = e.target.closest('[data-close]');
    if (closeTarget) closeModal(closeTarget.dataset.close);
    // Click outside modal to close
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target.id);
    }
  });

  // Save test (header button)
  document.getElementById('saveBtn').addEventListener('click', () => {
    syncBasicFromUI();
    saveTest();
  });

  // Publish toggle (header button)
  document.getElementById('publishToggleBtn').addEventListener('click', togglePublish);

  // ── Basic Edit tab ───────────────────────────────────
  const titleInput = document.getElementById('testTitle');
  const slugInput  = document.getElementById('testSlug');
  let _slugDirty = !!B.testId; // if editing, slug is considered "manually set"

  titleInput.addEventListener('input', () => {
    if (!_slugDirty) slugInput.value = toSlug(titleInput.value);
  });
  slugInput.addEventListener('input', () => { _slugDirty = true; });

  document.getElementById('testStatus').addEventListener('change', function() {
    const badge = document.getElementById('statusBadge');
    const pub = this.value === 'published';
    badge.textContent = pub ? 'Published' : 'Draft';
    badge.className   = `status-badge ${pub ? 'published' : 'draft'}`;
  });

  document.getElementById('testTitle').addEventListener('input', function() {
    const el = document.getElementById('headerTitle');
    if (el) el.textContent = this.value || 'New Reading Test';
  });

  document.getElementById('timeMinus').addEventListener('click', () => {
    const inp = document.getElementById('testTime');
    inp.value = Math.max(1, (parseInt(inp.value) || 60) - 5);
  });
  document.getElementById('timePlus').addEventListener('click', () => {
    const inp = document.getElementById('testTime');
    inp.value = Math.min(180, (parseInt(inp.value) || 60) + 5);
  });

  document.getElementById('saveBasicBtn').addEventListener('click', () => {
    syncBasicFromUI();
    _snapshotBasic();
    _syncHeaderTitle();
    showToast('Basic details saved.', 'success');
  });

  document.getElementById('discardBasicBtn').addEventListener('click', () => {
    _restoreBasicSnapshot();
    showToast('Changes discarded.', 'info');
  });

  // ── Passages tab ─────────────────────────────────────
  document.getElementById('addPassageBtn').addEventListener('click', () => openPassageModal());
  document.getElementById('savePassageBtn').addEventListener('click', savePassage);

  // ── Questions tab ────────────────────────────────────
  document.getElementById('passageSelector').addEventListener('change', function() {
    B._activePassageId = this.value || null;
    renderQuestionArea();
  });

  // Close add-group dropdown on outside click
  document.addEventListener('click', () => {
    const menu = document.getElementById('addGroupMenu');
    if (menu) menu.classList.add('hidden');
  });

  document.getElementById('saveGroupConfigBtn').addEventListener('click', saveGroupConfig);

  // Matching Headings modal
  document.getElementById('addHeadingRowBtn').addEventListener('click', () => {
    const count      = document.querySelectorAll('#headingInputsList .heading-input-row').length;
    const letterMode = B._openingMHType === 'matching_information';
    _appendHeadingRow('', count, letterMode);
  });
  document.getElementById('saveMHGroupBtn').addEventListener('click', saveMHGroup);

  // MCQ dynamic option rows
  const qAddMcqOptionBtn = document.getElementById('qAddMcqOptionBtn');
  if (qAddMcqOptionBtn) {
    qAddMcqOptionBtn.addEventListener('click', () => {
      const count = document.querySelectorAll('#qMcqOptionsList .mcq-option-row').length;
      if (count >= 8) { showToast('Maximum 8 options allowed.', 'error'); return; }
      _appendMcqOptionRow('');
    });
  }

  // Question image upload
  const qImageUploadBtn = document.getElementById('qImageUploadBtn');
  const qImageFile      = document.getElementById('qImageFile');
  const qImageRemoveBtn = document.getElementById('qImageRemoveBtn');
  if (qImageUploadBtn) {
    qImageUploadBtn.addEventListener('click', () => qImageFile.click());
    qImageFile.addEventListener('change', () => {
      if (qImageFile.files[0]) uploadQuestionImage(qImageFile.files[0]);
      qImageFile.value = '';  // reset so same file can re-trigger
    });
  }
  if (qImageRemoveBtn) {
    qImageRemoveBtn.addEventListener('click', () => _setQuestionImagePreview(null));
  }

  // Question modal
  document.getElementById('saveQuestionBtn').addEventListener('click', saveQuestion);
}

/* ─────────────────────────────────────────────────────────
   Boot
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const data = window.BUILDER_DATA;
  if (data) loadFromTestData(data);
  bindEvents();
  renderAll();
});
