import copy
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db
from models.listening import ListeningTest, ListeningAttempt

listening_api_bp = Blueprint('listening_api', __name__)

# ── Band score mapping (same as IELTS standard) ───────────────────────────────
# Raw score out of 40 → IELTS band
BAND_MAP = [
    (39, 9.0), (37, 8.5), (35, 8.0), (32, 7.5), (30, 7.0),
    (26, 6.5), (23, 6.0), (18, 5.5), (16, 5.0), (13, 4.5),
    (10, 4.0), ( 8, 3.5), ( 6, 3.0), ( 4, 2.5), ( 2, 2.0),
    ( 1, 1.0), ( 0, 0.0),
]


def raw_to_band(score):
    """Convert raw correct count (0–40) to IELTS band score."""
    for threshold, band in BAND_MAP:
        if score >= threshold:
            return band
    return 0.0


def strip_answers(test_json):
    """
    Deep-copy test JSON and remove answer/explanation/answer_location fields
    before sending to the student. CRITICAL: answers must NEVER reach the frontend
    before submission.
    """
    safe = copy.deepcopy(test_json)
    for part in safe.get('parts', []):
        for group in part.get('question_groups', []):
            for q in group.get('questions', []):
                q.pop('answer', None)
                q.pop('acceptable_answers', None)
                q.pop('explanation', None)
                q.pop('answer_location', None)
    return safe


# ── List published tests ───────────────────────────────────────────────────────

@listening_api_bp.route('/tests', methods=['GET'])
def list_tests():
    """
    GET /api/listening/tests
    List published tests. Filter: ?category=academic|general
    Returns metadata only — no test content.
    Auth: Optional
    """
    category = request.args.get('category')
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ListeningTest.query.filter_by(is_published=True)
    if category:
        query = query.filter_by(category=category)

    query      = query.order_by(ListeningTest.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    tests = [{
        'title':           t.title,
        'slug':            t.slug,
        'category':        t.category,
        'source_book':     t.source_book,
        'total_questions': t.total_questions,
        'time_limit':      t.time_limit,
        'has_transcript':  t.has_transcript,
    } for t in pagination.items]

    return jsonify({
        'success': True,
        'tests':   tests,
        'total':   pagination.total,
        'page':    pagination.page,
        'pages':   pagination.pages,
    })


# ── Get single test (student) ──────────────────────────────────────────────────

@listening_api_bp.route('/tests/<slug>', methods=['GET'])
@login_required
def get_test(slug):
    """
    GET /api/listening/tests/<slug>
    Full test JSON for rendering. Answers/explanations stripped.
    Auth: Required
    """
    test = ListeningTest.query.filter_by(slug=slug, is_published=True).first()
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    safe_json = strip_answers(test.test_json)

    return jsonify({
        'success': True,
        'test': {
            'id':              test.id,
            'title':           test.title,
            'slug':            test.slug,
            'category':        test.category,
            'source_book':     test.source_book,
            'total_questions': test.total_questions,
            'time_limit':      test.time_limit,
            'has_transcript':  test.has_transcript,
            'data':            safe_json,
        }
    })


# ── Submit answers ─────────────────────────────────────────────────────────────

@listening_api_bp.route('/tests/<slug>/submit', methods=['POST'])
@login_required
def submit_test(slug):
    """
    POST /api/listening/tests/<slug>/submit

    Body: { "answers": {"1": "kings", "11": ["B","C"]}, "time_taken": 1234 }

    Returns:
      score, total, band_score, time_taken,
      results: [{number, user_answer, correct_answer, is_correct,
                 explanation, answer_location}],
      has_transcript, transcripts: {part_number: "full text"}
    """
    test = ListeningTest.query.filter_by(slug=slug, is_published=True).first()
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    body = request.get_json()
    if not body:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    user_answers = body.get('answers', {})       # {str(q_number): answer}
    time_taken   = int(body.get('time_taken', 0))

    # ── Parse {{...}}[[N]] transcript markup → per-question answer location ──
    # Build map: {question_number: "highlighted text"} from all part transcripts
    import re as _re
    _markup_re = _re.compile(r'\{\{(.*?)\}\}\[\[(\d+)\]\]', _re.DOTALL)
    answer_location_map = {}   # int(q_num) -> "the text span"
    for part in test.test_json.get('parts', []):
        transcript = part.get('transcript', '')
        if transcript:
            for match in _markup_re.finditer(transcript):
                span_text = match.group(1)
                q_num     = int(match.group(2))
                # Keep first occurrence if a question is marked multiple times
                if q_num not in answer_location_map:
                    answer_location_map[q_num] = span_text

    # ── Collect correct answers + metadata from test_json ──────────────────
    results     = []
    score       = 0
    transcripts = {}  # {part_number: "transcript text with {{}}[[]] markup intact"}

    for part in test.test_json.get('parts', []):
        part_num = part.get('part_number')

        # Collect per-part transcript (markup preserved for frontend rendering)
        if test.has_transcript:
            transcripts[str(part_num)] = part.get('transcript', '')

        for group in part.get('question_groups', []):
            q_type = group.get('type')

            for q in group.get('questions', []):
                q_num         = str(q['number'])
                correct       = q.get('answer', '')
                acceptable    = q.get('acceptable_answers', [])
                explanation   = q.get('explanation', '')
                # Prefer transcript-markup derived location over old per-question field
                answer_loc    = answer_location_map.get(int(q_num), q.get('answer_location', ''))
                user_ans      = user_answers.get(q_num, '')

                is_correct = _check_answer(q_type, user_ans, correct, acceptable)
                if is_correct:
                    score += 1

                results.append({
                    'number':          int(q_num),
                    'user_answer':     user_ans,
                    'correct_answer':  correct,
                    'is_correct':      is_correct,
                    'explanation':     explanation,
                    'answer_location': answer_loc,
                })

    total      = test.total_questions
    band_score = raw_to_band(score)

    # ── Save attempt ───────────────────────────────────────────────────────
    attempt = ListeningAttempt(
        user_id      = current_user.id,
        test_id      = test.id,
        answers_json = user_answers,
        score        = score,
        band_score   = band_score,
        time_taken   = time_taken,
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        'success':        True,
        'score':          score,
        'total':          total,
        'band_score':     band_score,
        'time_taken':     time_taken,
        'results':        results,
        'has_transcript': test.has_transcript,
        'transcripts':    transcripts,
    })


def _check_answer(q_type, user_ans, correct, acceptable):
    """
    Type-aware answer checking.

    - mcq_multiple: user_ans is a list like ["B","C"]; correct is a list or slash-separated string
    - all others: case-insensitive string comparison; acceptable_answers also checked
    """
    if q_type == 'mcq_multiple':
        # Normalise both to sorted uppercase lists
        if isinstance(user_ans, list):
            user_set = set(a.strip().upper() for a in user_ans)
        else:
            user_set = set(user_ans.strip().upper().split(',')) if user_ans else set()

        if isinstance(correct, list):
            correct_set = set(a.strip().upper() for a in correct)
        else:
            # Support "B/C" or "B,C" stored answers
            correct_set = set(a.strip().upper() for a in correct.replace('/', ',').split(','))

        return user_set == correct_set

    # All text-based types (form_completion, note_completion, sentence_completion,
    # map_labelling) — exact case-insensitive match
    user_str = str(user_ans).strip().lower() if user_ans else ''
    if not user_str:
        return False

    correct_str = str(correct).strip().lower()
    if user_str == correct_str:
        return True

    # Check acceptable alternatives
    for alt in acceptable:
        if user_str == str(alt).strip().lower():
            return True

    return False


# ── Attempt history ────────────────────────────────────────────────────────────

@listening_api_bp.route('/attempts', methods=['GET'])
@login_required
def list_attempts():
    """
    GET /api/listening/attempts
    Current user's listening attempt history.
    Auth: Required
    """
    attempts = ListeningAttempt.query.filter_by(
        user_id=current_user.id
    ).order_by(ListeningAttempt.completed_at.desc()).all()

    results = []
    for a in attempts:
        t = ListeningTest.query.get(a.test_id)
        results.append({
            'id':           a.id,
            'test_title':   t.title if t else 'Deleted Test',
            'test_slug':    t.slug  if t else None,
            'score':        a.score,
            'total':        t.total_questions if t else None,
            'band_score':   a.band_score,
            'time_taken':   a.time_taken,
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
        })

    return jsonify({'success': True, 'attempts': results})
