# ScoreMate — Agent Onboarding Guide

> **READ THIS FIRST.** This file contains everything a new agent needs to understand the codebase, make changes consistently, and avoid breaking existing work. Read the full file before touching any code.

---

## What This Project Is

**ScoreMate** — a web-based IELTS preparation platform. Students practice Writing (Task 1 + Task 2), Speaking, and Reading. AI (Google Gemini 2.5 Flash) evaluates writing and speaking. Reading uses a custom quiz engine with an admin builder and student renderer.

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| Backend | Python / Flask |
| Database | SQLite via Flask-SQLAlchemy |
| Auth | Flask-Login |
| AI | Google Gemini 2.5 Flash (`google-genai`) |
| Frontend | Vanilla HTML5 / CSS3 / JS ES6+ — **no framework, no bundler** |
| Styling | Custom CSS custom properties, light/dark mode |
| Icons | Lucide Icons |
| Deploy | `Procfile` + `requirements.txt` (Heroku-compatible) |

---

## Project Structure

```
ScoreMate/
├── app.py                          # Flask app factory: create_app()
├── config.py                       # API keys, DB path, secret key
├── .env                            # GEMINI_API_KEY, FLASK_DEBUG (gitignored)
├── scoremate.db                    # SQLite DB (auto-created on first run)
│
├── blueprints/
│   ├── admin/admin.py              # /admin/ — user management
│   ├── auth/auth.py                # /auth/login, /auth/register
│   ├── writing/task1.py            # /api/writing/task1/check
│   ├── writing/task2.py            # /api/writing/task2/check
│   ├── speaking/speaking.py        # /api/speaking/evaluate|generate
│   └── reading/
│       ├── reading_admin.py        # /admin/reading/* — CRUD + image upload
│       └── reading_api.py          # /api/reading/* — student-facing endpoints
│
├── models/
│   ├── __init__.py                 # db = SQLAlchemy()
│   ├── user.py                     # User, EvaluationResult models
│   └── reading.py                  # ReadingTest, ReadingAttempt models
│
├── services/
│   └── gemini_service.py           # Singleton GeminiService — all Gemini API calls
│
├── utils/
│   └── decorators.py               # @admin_required, @superadmin_required
│
├── static/
│   ├── css/
│   │   ├── style.css               # Global CSS vars, SPA section layout
│   │   ├── auth.css                # Login / register pages
│   │   ├── dashboard.css           # Student dashboard + reading history table
│   │   ├── admin.css               # Admin panel base styles
│   │   ├── reading.css             # Student reading test player
│   │   └── reading_builder.css     # Admin quiz builder UI
│   ├── js/
│   │   ├── main.js                 # SPA section toggle, reading hub loader
│   │   ├── reading_builder.js      # Admin quiz builder — all state + UI logic
│   │   └── reading_renderer.js     # Student test renderer — handles all question types
│   └── images/
│       └── reading_uploads/        # Question images from admin upload
│
├── templates/
│   ├── index.html                  # Main SPA (writing/speaking/calculators/reading hub)
│   ├── dashboard.html              # Student dashboard (history + reading results)
│   ├── auth/login.html
│   ├── auth/register.html
│   ├── admin/
│   │   ├── dashboard.html          # Admin overview
│   │   ├── users.html              # User management table
│   │   ├── reading_tests.html      # Reading test list with publish toggle
│   │   └── reading_builder.html    # 3-tab quiz builder wizard
│   └── errors/403.html
│
├── CLAUDE.md                       # Claude Code auto-loads this
├── GEMINI.md                       # This file — for Gemini/Antigravity agents
└── ScoreMate_CSS_Design_Guide.md   # Reading module CSS spec (pixel-exact values)
```

---

## Development Setup

```bash
pip install -r requirements.txt

# Create .env:
GEMINI_API_KEY=your_key_here
FLASK_DEBUG=1

python app.py   # starts on http://localhost:5001
```

On first run, SQLite tables are auto-created. Admin users need to be promoted via:
```bash
python scripts/manage_roles.py
```

---

## User Roles

| Role | Access |
|------|--------|
| `student` | `/dashboard`, all `/api/*` endpoints |
| `admin` | `/admin/*` including reading builder |
| `superadmin` | Everything + role management |

---

## All API Routes

### Auth (`/auth/`)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/auth/login` | Login |
| GET/POST | `/auth/register` | Register |
| GET | `/auth/logout` | Logout |

### Student Pages
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Main SPA (index.html) |
| GET | `/dashboard` | Student dashboard (login required) |

### Writing + Speaking APIs
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/writing/task1/check` | Evaluate Writing Task 1 |
| POST | `/api/writing/task2/check` | Evaluate Writing Task 2 |
| POST | `/api/speaking/evaluate` | Evaluate speaking |
| POST | `/api/speaking/generate` | Generate sample answer |

### Reading APIs (`/api/reading/`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/reading/tests` | List published tests (query: `?category=academic\|general`) |
| GET | `/api/reading/tests/<slug>` | Get test JSON (answers stripped for students) |
| POST | `/api/reading/tests/<slug>/submit` | Submit answers → score, band, per-Q results |
| GET | `/api/reading/attempts` | Current user's attempt history |

### Admin Reading (`/admin/reading/`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/reading/` | Reading test list page |
| GET | `/admin/reading/create` | New test builder UI |
| POST | `/admin/reading/save` | Create test (JSON body) |
| GET | `/admin/reading/<test_id>/edit` | Edit test builder UI |
| PUT | `/admin/reading/<test_id>` | Update test |
| POST | `/admin/reading/<test_id>/publish` | Toggle publish status |
| DELETE | `/admin/reading/<test_id>` | Delete test |
| POST | `/admin/reading/upload-image` | Upload question image → returns `{"url": "..."}` |

---

## Database Models

### `models/user.py`
- **`User`**: `id`, `email`, `username`, `password_hash`, `role` (student/admin/superadmin), `created_at`
- **`EvaluationResult`**: stores writing/speaking eval results per user

### `models/reading.py`
- **`ReadingTest`**: `id` (UUID), `title`, `slug` (unique), `category` (academic|general), `source_book`, `total_questions` (default 40), `time_limit` (minutes, default 60), `test_json` (JSON), `is_published` (bool)
- **`ReadingAttempt`**: `id` (UUID), `user_id` (FK→users), `test_id` (FK→reading_test), `answers_json` ({q_number: answer}), `score` (int), `band_score` (float), `time_taken` (seconds), `completed_at`

---

## Frontend Architecture

### SPA Pattern (`index.html` + `main.js`)
`index.html` is a single page with multiple `.section` divs. Only one is visible at a time.

```javascript
// Toggle sections:
showSection('sectionId', pushState=true, param=null)

// Special param usage:
showSection('reading_test', true, slug)  // loads test by slug
showSection('reading_hub', true)         // loads reading test list
```

### CSS Variable System
Two sets of variables in use:

**Global (`style.css`)**:
```css
--primary: #6366f1
--primary-hover: #4f46e5
--bg-main, --bg-card, --bg-input
--border, --border-focus
--text, --text-muted, --text-light
```

**Admin (`admin.css`)**:
```css
--admin-sidebar-bg, --admin-header-bg
--admin-accent: #6366f1
```

**Reading player (`reading.css`, `ScoreMate_CSS_Design_Guide.md`)**:
```css
--color-primary-blue: #2563eb
--color-primary-blue-dark: #1d4ed8
--color-text-primary: rgb(0,0,0)
--color-text-secondary: #6b7280
--color-border: rgb(211,211,211)
--color-border-section: #e5e7eb
--color-bg-page: #f5f5f5
--color-bg-white: #ffffff
--color-success: #16a34a
--color-error: #dc2626
```

### Modal Pattern
All modals: `.modal-overlay` (fixed full-screen backdrop) + `.modal-content` child.
Open = remove `.hidden` class. Close = add `.hidden` class.

### Dropdown Pattern (builder type-picker)
```html
<div class="dropdown-wrapper">   <!-- position:relative -->
  <button id="addGroupBtn">+ Add Question Group ▾</button>
  <div id="addGroupMenu" class="dropdown-menu hidden"> <!-- absolute, z-index:200 -->
    <button onclick="openGroupModal('type')">Type Name</button>
  </div>
</div>
```
Outside-click closes dropdown via `document.addEventListener('click', ...)` in `bindEvents()`.

---

## Reading Module (Core Feature — Most Complex)

### How It Works End-to-End

```
Admin creates test in builder
  → builder.js assembles test_json
  → POST /admin/reading/save → stored in ReadingTest.test_json

Student opens reading hub
  → GET /api/reading/tests → list of published tests
  → click test → GET /api/reading/tests/<slug> → test_json (answers stripped)
  → reading_renderer.js renders passage + questions

Student submits answers
  → POST /api/reading/tests/<slug>/submit → {score, band_score, results}
  → ReadingAttempt saved to DB

Student dashboard
  → app.py dashboard route queries ReadingAttempt for current user
  → passes reading_data to dashboard.html
```

### `test_json` Schema (Full)

```json
{
  "parts": [
    {
      "part_number": 1,
      "passage": {
        "title": "Passage Title",
        "sections": [
          {
            "heading": "Optional section heading (letter A, B, C…)",
            "paragraphs": ["Para text...", "Para text..."]
          }
        ]
      },
      "question_groups": [
        {
          "group_id": "g1",
          "type": "matching_headings",
          "instructions": "Choose the correct heading for paragraphs i–v",
          "option_pool": [{"text": "Heading text"}],
          "allow_reuse": false,
          "constraint": "",
          "context_html": "",
          "questions": [
            {
              "number": 1,
              "text": "i",
              "answer": "C",
              "options": null,
              "image_url": null,
              "explanation": "optional"
            }
          ]
        }
      ]
    }
  ]
}
```

### All Supported Question Types

| Type | Group-level fields | Per-question fields |
|------|--------------------|---------------------|
| `matching_headings` | `option_pool: [{text}]`, `allow_reuse` | `number`, `text` (Roman numeral), `answer` (pool index A/B/C…) |
| `matching_information` | `option_pool: [{letter, text}]`, `allow_reuse` | `number`, `text` (question stem), `answer` (letter) |
| `tfng` | `instructions` | `number`, `text` (statement), `answer` (TRUE/FALSE/NOT GIVEN) |
| `ynng` | `instructions` | `number`, `text` (statement), `answer` (YES/NO/NOT GIVEN) |
| `mcq_single` | `instructions` | `number`, `text`, `options: [{letter, text}]` (A–H, dynamic), `answer` (letter) |
| `sentence_completion` | `instructions`, `constraint`, `context_html` (HTML with `[[N]]` blanks) | `number`, `answer` |
| `note_completion` | same as sentence_completion | same |
| `summary_completion` | same as sentence_completion | same |
| `table_completion` | same as sentence_completion | same |
| `short_answer` | `instructions`, `constraint` | `number`, `text` (question), `answer` |

All question types may additionally have: `image_url` (string URL) and `explanation` (string).

### `[[N]]` Blank Marker System (Completion Types)
- Admin pastes HTML into `context_html` field with `[[1]]`, `[[2]]` markers
- Renderer replaces `[[N]]` with `<input data-q="N" class="text-answer">` inline
- N values must match the `number` field of the corresponding questions in the group
- Sequential integers starting from whatever the first question number is

---

## Admin Quiz Builder

**File**: `templates/admin/reading_builder.html` + `static/js/reading_builder.js`

### 3-Tab Wizard
1. **Basic** — title, slug, category (academic/general), source book, total questions, time limit
2. **Passages** — add/edit passage parts with sections and paragraphs
3. **Questions** — add question groups and questions

### Builder State Object `B`

```javascript
const B = {
  testId: null,            // null = create mode, string UUID = edit mode
  mode: 'create',          // 'create' | 'edit'
  basicData: {},           // {title, slug, category, source_book, total_questions, time_limit}
  passages: [],            // [{id, part_number, title, sections:[{id,heading,paragraphs:[]}]}]
  groups: [],              // see group shape below
  _openingMHType: null,    // stash: 'matching_headings' | 'matching_information'
}

// Group shape:
{
  id: 'g1',                // string, auto-assigned
  type: 'matching_headings' | 'matching_information' | 'tfng' | 'ynng' |
        'mcq_single' | 'sentence_completion' | 'note_completion' |
        'summary_completion' | 'table_completion' | 'short_answer',
  instructions: '',
  constraint: '',          // used by: sentence_completion, note_completion,
                           //           summary_completion, table_completion, short_answer
  context_html: '',        // used by: *_completion types (contains [[N]] markers)
  option_pool: [],         // MH: [{text}]  MI: [{letter, text}]
  allow_reuse: false,
  questions: []            // [{id, number, text, answer, options, image_url, explanation}]
}
```

### Key Builder Functions

| Function | What it does |
|----------|-------------|
| `toggleAddGroupMenu(event)` | Shows/hides the type-picker dropdown |
| `openGroupModal(type, groupId)` | Opens group config modal; routes MH/MI to `_openMHModal`; shows variant radio for tfng/ynng |
| `saveGroupConfig()` | Saves non-MH/MI groups; resolves tfng/ynng from radio button selection |
| `saveMHGroup()` | Saves matching_headings / matching_information groups with option pool |
| `openEditGroupModal(groupId)` | Routes back to correct modal: MH/MI → `_openMHModal`, others → `openGroupModal` |
| `_configureQuestionModal(group, q)` | Sets up question modal fields based on group type; pre-fills for edit |
| `saveQuestion()` | Type-aware save; mcq_single reads dynamic option rows |
| `buildTestJson()` | Assembles final `test_json` blob from all state |
| `loadFromTestData(test)` | Populates state from existing test for edit mode |
| `uploadQuestionImage(file)` | POSTs to `/admin/reading/upload-image`, updates hidden URL field |
| `_appendMcqOptionRow(value)` | Adds a dynamic MCQ option row (A→H, max 8) |
| `_reindexMcqOptions()` | Re-labels letter column after row removal |
| `_syncMcqAnswerDropdown()` | Keeps answer dropdown in sync with dynamic option list |
| `_appendHeadingRow(value, idx, letterMode)` | MH = Roman numerals; MI = letters (A, B, C…) |
| `_reindexHeadingRows()` | Re-labels rows after removal using `data-letterMode` attribute |
| `renderGroupCard(group)` | Type-aware card with badge, pool chips, constraint tag, context preview |

### TFNG / YNNG Unified Modal
- Builder shows a single "True/False / Yes/No + Not Given" option in type picker
- `groupConfigModal` has a variant radio selector: `tfng` or `ynng`
- `saveGroupConfig()` reads the selected radio to set the actual group type
- Edit mode: `openEditGroupModal` routes `ynng` groups through `openGroupModal('ynng', groupId)` which pre-selects the radio

### Dynamic MCQ Options
- Default: 4 rows (A–D). Min 2, max 8 (A–H)
- Each row: letter label + text input + remove button
- `_syncMcqAnswerDropdown()` rebuilds answer `<select>` after every add/remove
- Edit mode: pre-fills from `q.options` array

---

## Student Reading Renderer

**File**: `static/js/reading_renderer.js`

- Handles all supported question types (no changes needed when adding new types IF schema matches)
- Top-level function: `renderQuestionGroup(group, partIdx, groupIdx)`
- Completion types: scans `context_html` and replaces `[[N]]` with `<input data-q="N">`
- Images: renders `<img class="rq-question-image">` after question text when `q.image_url` exists

---

## CSS Design Spec (Reading Player)

See `ScoreMate_CSS_Design_Guide.md` for the full reference. Critical values:

### Fixed Dimensions (do not change)
| Element | Size |
|---------|------|
| Text input / select dropdown | 144px wide |
| Question number box | 30×30px, border-radius 2px |
| Option letter circle | 30×30px, border-radius 50% |
| Panel divider | 8px wide |
| Left indent (content below q-number) | 38px (30px box + 8px gap) |

### Typography
| Element | Size | Weight | Line-height |
|---------|------|--------|-------------|
| Passage text | 18px | 400 | 36px |
| Question text / stem | 18px | 400 | 27px |
| Section header | 18px | 700 | 1.2 |
| Question number | 18px | 700 | — |
| Option letter | 17px | 700 | — |
| Constraint text | 18px | 700 | 1.4 (uppercase) |

### Layout
- Split panel: `grid-template-columns: 1fr 8px 1fr`
- Height: `calc(100vh - 60px - 50px)` (subtracts header + footer)
- Both panels scroll independently with styled scrollbars

### Interactive States
- Hover radio/checkbox row: `background-color: rgba(37,99,235,0.05)`
- Selected radio letter: fill `#2563eb`, white text
- Focus on any input: `outline: 2px solid #2563eb; outline-offset: 2px`
- Selected question bubble: white bg, blue text

---

## Student Dashboard — Reading History

`app.py` dashboard route queries last 10 `ReadingAttempt` for current user and passes:
```python
reading_data = [{
    'test_title': ...,
    'test_slug': ...,
    'score': ...,
    'total': ...,
    'band_score': ...,
    'time_taken': ...,
    'completed_at': ...,
}]
```

`templates/dashboard.html` renders a table: test name | score chip | band chip | date | Retake link.
Retake link calls `showSection('reading_test', true, slug)`.

---

## Current Feature Status (as of 2026-06-01)

| Feature | Status |
|---------|--------|
| Writing Task 1 + Task 2 (Gemini eval) | ✅ Complete |
| Speaking eval + sample generation | ✅ Complete |
| Auth (login/register/roles) | ✅ Complete |
| Student + Admin dashboards | ✅ Complete |
| Reading test player (all 9 types) | ✅ Complete |
| Reading hub (browse + filter) | ✅ Complete |
| Admin reading builder — Matching Headings | ✅ Complete |
| Admin reading builder — Matching Information | ✅ Complete |
| Admin reading builder — TFNG / YNNG (unified) | ✅ Complete |
| Admin reading builder — MCQ (dynamic A–H options) | ✅ Complete |
| Admin reading builder — Sentence/Note/Summary/Table Completion | ✅ Complete |
| Admin reading builder — Short Answer | ✅ Complete |
| Admin reading builder — Image upload per question | ✅ Complete |
| Student dashboard reading history | ✅ Complete |

---

## Known Gotchas — Read Before Making Changes

1. **`scoremate.db` not in git** — run `python app.py` once before any reading features work (tables auto-created)
2. **Image uploads** go to `static/images/reading_uploads/` — this directory is created automatically by `reading_admin.py` on first upload
3. **`test_json` is a JSON column** in SQLite — Flask-SQLAlchemy handles serialization; treat it as a Python dict in backend code
4. **Band score mapping** lives in `reading_api.py` `submit_test()` — raw score 0–40 → band 0–9
5. **`allow_reuse` on matching groups** — when `false`, renderer greys out already-selected options in the pool
6. **TFNG vs YNNG** — stored as separate types in DB; share one builder modal entry; `saveGroupConfig()` resolves via radio
7. **MCQ `options` array always per-question** (not group level) — each question has its own `[{letter, text}]` list
8. **`[[N]]` markers** in `context_html` must be sequential integers matching the question `number` fields in that group
9. **`B._openingMHType` stash** — used to track whether the MH/MI modal was opened for headings (Roman numerals) or information (letters); checked by `addHeadingRowBtn` click handler
10. **`completionTypes` array** (`['sentence_completion','note_completion','summary_completion','table_completion']`) is used as a single source of truth in 3 places in `reading_builder.js` — if adding new completion types, update all 3
11. **Admin blueprint prefix** — reading admin is at `/admin/reading/*` (registered in `app.py` with `url_prefix='/admin/reading'`)
12. **No framework** — all DOM manipulation is raw JS (`document.getElementById`, `createElement`, etc.). Do not introduce React, Vue, jQuery, or any dependency

---

## How to Run a Sanity Check

```bash
# Boot check
python -c "from app import create_app; create_app(); print('OK')"

# Full server
python app.py
# → http://localhost:5001
# → /admin/reading/create to test builder
# → /api/reading/tests to test API
```
