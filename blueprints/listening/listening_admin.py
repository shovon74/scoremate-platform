import os
from flask import Blueprint, request, jsonify, abort, current_app, render_template
from flask_login import login_required
from werkzeug.utils import secure_filename
from models import db
from models.user import User
from models.listening import ListeningTest
from utils.decorators import role_required

listening_admin_bp = Blueprint('listening_admin', __name__)

ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}


def allowed_audio(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


# ── List all tests (JSON) ────────────────────────────────────────────────────

@listening_admin_bp.route('/')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def list_tests():
    """GET /admin/listening/ — JSON list of all listening tests."""
    tests = ListeningTest.query.order_by(ListeningTest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'tests': [{
            'id':              t.id,
            'title':           t.title,
            'slug':            t.slug,
            'category':        t.category,
            'source_book':     t.source_book,
            'total_questions': t.total_questions,
            'time_limit':      t.time_limit,
            'has_transcript':  t.has_transcript,
            'is_published':    t.is_published,
            'created_at':      t.created_at.isoformat() if t.created_at else None,
        } for t in tests],
    })


# ── List page (HTML) ─────────────────────────────────────────────────────────

@listening_admin_bp.route('/list')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def list_tests_page():
    """GET /admin/listening/list — HTML page listing all tests."""
    tests = ListeningTest.query.order_by(ListeningTest.created_at.desc()).all()
    tests_data = [{
        'id':              t.id,
        'title':           t.title,
        'slug':            t.slug,
        'category':        t.category or 'academic',
        'total_questions': t.total_questions,
        'time_limit':      t.time_limit,
        'has_transcript':  t.has_transcript,
        'is_published':    t.is_published,
        'created_at':      t.created_at.isoformat() if t.created_at else None,
    } for t in tests]
    return render_template('admin/listening_tests.html', tests=tests_data)


# ── Create form (HTML) ────────────────────────────────────────────────────────

@listening_admin_bp.route('/create')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def create_form():
    """GET /admin/listening/create — Render the builder for a new test."""
    return render_template('admin/listening_builder.html', test_data=None)


# ── Save new test ─────────────────────────────────────────────────────────────

@listening_admin_bp.route('/save', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def save_test():
    """
    POST /admin/listening/save
    Accepts full test_json body. Creates a new ListeningTest.
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON body required'}), 400

    title     = data.get('title', '').strip()
    slug      = data.get('slug', '').strip()
    test_json = data.get('test_json')

    if not title or not slug:
        return jsonify({'success': False, 'error': 'title and slug are required'}), 400
    if not test_json:
        return jsonify({'success': False, 'error': 'test_json is required'}), 400

    # Duplicate slug check
    if ListeningTest.query.filter_by(slug=slug).first():
        return jsonify({'success': False, 'error': f'Slug "{slug}" already exists'}), 409

    test = ListeningTest(
        title           = title,
        slug            = slug,
        category        = data.get('category', 'academic'),
        source_book     = data.get('source_book', ''),
        total_questions = int(data.get('total_questions', 40)),
        time_limit      = int(data.get('time_limit', 30)),
        has_transcript  = bool(data.get('has_transcript', False)),
        test_json       = test_json,
        is_published    = bool(data.get('is_published', False)),
    )
    db.session.add(test)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Test saved',
        'test_id': test.id,
        'slug':    test.slug,
    }), 201


# ── Update existing test ───────────────────────────────────────────────────────

@listening_admin_bp.route('/<test_id>', methods=['PUT'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def update_test(test_id):
    """PUT /admin/listening/<id> — Update an existing test."""
    test = ListeningTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON body required'}), 400

    new_slug = data.get('slug', '').strip()
    if new_slug and new_slug != test.slug:
        if ListeningTest.query.filter_by(slug=new_slug).first():
            return jsonify({'success': False, 'error': f'Slug "{new_slug}" already exists'}), 409
        test.slug = new_slug

    if 'title'           in data: test.title           = data['title'].strip()
    if 'category'        in data: test.category        = data['category']
    if 'source_book'     in data: test.source_book     = data['source_book']
    if 'time_limit'      in data: test.time_limit      = int(data['time_limit'])
    if 'total_questions' in data: test.total_questions = int(data['total_questions'])
    if 'has_transcript'  in data: test.has_transcript  = bool(data['has_transcript'])
    if 'is_published'    in data: test.is_published    = bool(data['is_published'])
    if 'test_json'       in data: test.test_json       = data['test_json']

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Test updated',
        'test_id': test.id,
        'slug':    test.slug,
    })


# ── Edit form (HTML) ──────────────────────────────────────────────────────────

@listening_admin_bp.route('/<test_id>/edit')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def edit_form(test_id):
    """GET /admin/listening/<id>/edit — Builder pre-filled with existing data."""
    test = ListeningTest.query.get(test_id)
    if not test:
        abort(404)

    test_data = {
        'id':             test.id,
        'title':          test.title,
        'slug':           test.slug,
        'category':       test.category,
        'source_book':    test.source_book,
        'time_limit':     test.time_limit,
        'total_questions':test.total_questions,
        'has_transcript': test.has_transcript,
        'is_published':   test.is_published,
        'test_json':      test.test_json,
    }
    return render_template('admin/listening_builder.html', test_data=test_data)


# ── Publish toggle ─────────────────────────────────────────────────────────────

@listening_admin_bp.route('/<test_id>/publish', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def toggle_publish(test_id):
    """POST /admin/listening/<id>/publish — Toggle is_published."""
    test = ListeningTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    test.is_published = not test.is_published
    db.session.commit()

    status = 'published' if test.is_published else 'unpublished'
    return jsonify({
        'success':      True,
        'message':      f'Test {status}',
        'is_published': test.is_published,
    })


# ── Delete test ────────────────────────────────────────────────────────────────

@listening_admin_bp.route('/<test_id>', methods=['DELETE'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def delete_test(test_id):
    """DELETE /admin/listening/<id> — Delete test and all its attempts."""
    test = ListeningTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    db.session.delete(test)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Test deleted'})


# ── Audio upload ───────────────────────────────────────────────────────────────

@listening_admin_bp.route('/upload-audio', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def upload_audio():
    """
    POST /admin/listening/upload-audio
    Upload a part audio file (.mp3 / .wav / .ogg / .m4a).
    Returns: {"success": true, "url": "/static/audio/listening_uploads/<filename>"}
    """
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file provided'}), 400

    file = request.files['audio']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_audio(file.filename):
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_AUDIO_EXTENSIONS)}'
        }), 400

    filename   = secure_filename(file.filename)
    upload_dir = os.path.join(current_app.static_folder, 'audio', 'listening_uploads')
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    return jsonify({
        'success': True,
        'url': f'/static/audio/listening_uploads/{filename}',
    })


# ── Diagram/image upload (for map_labelling questions) ────────────────────────

@listening_admin_bp.route('/upload-image', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def upload_image():
    """
    POST /admin/listening/upload-image
    Upload a diagram image for map_labelling question type.
    Returns: {"success": true, "url": "/static/images/listening/<filename>"}
    """
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_image(file.filename):
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
        }), 400

    filename   = secure_filename(file.filename)
    upload_dir = os.path.join(current_app.static_folder, 'images', 'listening')
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    return jsonify({
        'success': True,
        'url': f'/static/images/listening/{filename}',
    })
