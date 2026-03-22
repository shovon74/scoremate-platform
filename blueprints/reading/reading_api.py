import copy
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.reading import ReadingTest, ReadingAttempt

reading_api_bp = Blueprint('reading_api', __name__)


def strip_answers(test_json):
    """
    Deep-copy the test JSON and remove all answer fields before sending to the student.
    CRITICAL: Answers must NEVER be sent to the frontend.
    """
    safe = copy.deepcopy(test_json)
    for part in safe.get('parts', []):
        for group in part.get('question_groups', []):
            for question in group.get('questions', []):
                question.pop('answer', None)
                question.pop('acceptable_answers', None)
    return safe


@reading_api_bp.route('/tests', methods=['GET'])
def list_tests():
    """
    GET /api/reading/tests
    List published tests (paginated). Filter: ?category=academic&type=tfng
    Returns: title, slug, category, question_count. NO test content.
    Auth: Optional
    """
    category = request.args.get('category')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ReadingTest.query.filter_by(is_published=True)

    if category:
        query = query.filter_by(category=category)

    query = query.order_by(ReadingTest.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    tests = [{
        'title': t.title,
        'slug': t.slug,
        'category': t.category,
        'source_book': t.source_book,
        'total_questions': t.total_questions,
        'time_limit': t.time_limit,
    } for t in pagination.items]

    return jsonify({
        'success': True,
        'tests': tests,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@reading_api_bp.route('/tests/<slug>', methods=['GET'])
@login_required
def get_test(slug):
    """
    GET /api/reading/tests/<slug>
    Full test data for rendering: passages + questions. NEVER includes answers.
    Auth: Required
    """
    test = ReadingTest.query.filter_by(slug=slug, is_published=True).first()

    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    safe_json = strip_answers(test.test_json)

    return jsonify({
        'success': True,
        'test': {
            'id': test.id,
            'title': test.title,
            'slug': test.slug,
            'category': test.category,
            'source_book': test.source_book,
            'total_questions': test.total_questions,
            'time_limit': test.time_limit,
            'data': safe_json,
        }
    })


@reading_api_bp.route('/tests/<slug>/submit', methods=['POST'])
@login_required
def submit_test(slug):
    """
    POST /api/reading/tests/<slug>/submit
    Submit answers {q_number: answer}. Returns: score, band_score, correct_answers, time_taken.
    Auth: Required

    TODO: Implement real answer validation and band score calculation in later steps.
    """
    test = ReadingTest.query.filter_by(slug=slug, is_published=True).first()

    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    answers = data.get('answers', {})
    time_taken = data.get('time_taken', 0)

    # --- Mock scoring (to be replaced with real validation in Step 9) ---
    score = 0
    total = test.total_questions
    correct_answers = {}

    # Extract correct answers from test_json for validation
    for part in test.test_json.get('parts', []):
        for group in part.get('question_groups', []):
            for question in group.get('questions', []):
                q_num = str(question['number'])
                correct = question.get('answer', '')
                correct_answers[q_num] = correct

                # Simple exact match for now
                user_answer = answers.get(q_num, '').strip()
                if user_answer and user_answer.lower() == correct.lower():
                    score += 1

    band_score = round(score / max(total, 1) * 9, 1)  # Rough placeholder

    # Save the attempt
    from models import db
    attempt = ReadingAttempt(
        user_id=current_user.id,
        test_id=test.id,
        answers_json=answers,
        score=score,
        band_score=band_score,
        time_taken=time_taken,
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        'success': True,
        'score': score,
        'total': total,
        'band_score': band_score,
        'time_taken': time_taken,
        'correct_answers': correct_answers,
    })


@reading_api_bp.route('/attempts', methods=['GET'])
@login_required
def list_attempts():
    """
    GET /api/reading/attempts
    User's attempt history. Returns: test title, score, band, date.
    Auth: Required
    """
    attempts = ReadingAttempt.query.filter_by(
        user_id=current_user.id
    ).order_by(ReadingAttempt.completed_at.desc()).all()

    results = []
    for a in attempts:
        test = ReadingTest.query.get(a.test_id)
        results.append({
            'id': a.id,
            'test_title': test.title if test else 'Deleted Test',
            'test_slug': test.slug if test else None,
            'score': a.score,
            'total': test.total_questions if test else None,
            'band_score': a.band_score,
            'time_taken': a.time_taken,
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
        })

    return jsonify({
        'success': True,
        'attempts': results,
    })
