import os
from flask import Blueprint, request, jsonify, abort, current_app, render_template
from flask_login import login_required
from werkzeug.utils import secure_filename
from models import db
from models.user import User
from models.reading import ReadingTest
from utils.decorators import role_required

reading_admin_bp = Blueprint('reading_admin', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@reading_admin_bp.route('/')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def list_tests():
    """
    GET /admin/reading
    List all tests (published + drafts) for admin management.
    """
    tests = ReadingTest.query.order_by(ReadingTest.created_at.desc()).all()

    return jsonify({
        'success': True,
        'tests': [{
            'id': t.id,
            'title': t.title,
            'slug': t.slug,
            'category': t.category,
            'source_book': t.source_book,
            'total_questions': t.total_questions,
            'is_published': t.is_published,
            'created_at': t.created_at.isoformat() if t.created_at else None,
        } for t in tests],
    })


@reading_admin_bp.route('/list')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def list_tests_page():
    """GET /admin/reading/list — HTML page listing all tests."""
    tests = ReadingTest.query.order_by(ReadingTest.created_at.desc()).all()
    tests_data = [{
        'id':              t.id,
        'title':           t.title,
        'slug':            t.slug,
        'category':        t.category or 'academic',
        'total_questions': t.total_questions,
        'time_limit':      t.time_limit,
        'is_published':    t.is_published,
        'created_at':      t.created_at.isoformat() if t.created_at else None,
    } for t in tests]
    return render_template('admin/reading_tests.html', tests=tests_data)


@reading_admin_bp.route('/create')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def create_form():
    """GET /admin/reading/create — Render the quiz builder for a new test."""
    return render_template('admin/reading_builder.html', test_data=None)


@reading_admin_bp.route('/save', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def save_test():
    """
    POST /admin/reading/save
    Save a new test from the full test_json body.
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON body required'}), 400

    title = data.get('title', '').strip()
    slug = data.get('slug', '').strip()
    test_json = data.get('test_json')

    if not title or not slug:
        return jsonify({'success': False, 'error': 'title and slug are required'}), 400

    if not test_json:
        return jsonify({'success': False, 'error': 'test_json is required'}), 400

    # Check for duplicate slug
    existing = ReadingTest.query.filter_by(slug=slug).first()
    if existing:
        return jsonify({'success': False, 'error': f'Slug "{slug}" already exists'}), 409

    test = ReadingTest(
        title=title,
        slug=slug,
        category=data.get('category', 'academic'),
        source_book=data.get('source_book'),
        total_questions=data.get('total_questions', 0),
        time_limit=data.get('time_limit', 60),
        test_json=test_json,
        is_published=bool(data.get('is_published', False)),
    )
    db.session.add(test)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Test saved as draft',
        'test_id': test.id,
        'slug': test.slug,
    }), 201


@reading_admin_bp.route('/<test_id>', methods=['PUT'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def update_test(test_id):
    """PUT /admin/reading/<id> — Update an existing test."""
    test = ReadingTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'JSON body required'}), 400

    new_slug = data.get('slug', '').strip()
    if new_slug and new_slug != test.slug:
        conflict = ReadingTest.query.filter_by(slug=new_slug).first()
        if conflict:
            return jsonify({'success': False, 'error': f'Slug "{new_slug}" already exists'}), 409
        test.slug = new_slug

    if 'title'           in data: test.title           = data['title'].strip()
    if 'category'        in data: test.category        = data['category']
    if 'time_limit'      in data: test.time_limit       = int(data['time_limit'])
    if 'is_published'    in data: test.is_published     = bool(data['is_published'])
    if 'total_questions' in data: test.total_questions  = int(data['total_questions'])
    if 'test_json'       in data: test.test_json        = data['test_json']

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Test updated',
        'test_id': test.id,
        'slug':    test.slug,
    })


@reading_admin_bp.route('/<test_id>/edit')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def edit_form(test_id):
    """GET /admin/reading/<id>/edit — Render the quiz builder pre-filled with existing test data."""
    test = ReadingTest.query.get(test_id)
    if not test:
        abort(404)

    test_data = {
        'id':          test.id,
        'title':       test.title,
        'slug':        test.slug,
        'description': '',
        'category':    test.category,
        'time_limit':  test.time_limit,
        'is_published': test.is_published,
        'test_json':   test.test_json,
    }
    return render_template('admin/reading_builder.html', test_data=test_data)


@reading_admin_bp.route('/<test_id>/publish', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def toggle_publish(test_id):
    """
    POST /admin/reading/<id>/publish
    Toggle publish/unpublish status.
    """
    test = ReadingTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    test.is_published = not test.is_published
    db.session.commit()

    status = 'published' if test.is_published else 'unpublished'
    return jsonify({
        'success': True,
        'message': f'Test {status}',
        'is_published': test.is_published,
    })


@reading_admin_bp.route('/<test_id>', methods=['DELETE'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def delete_test(test_id):
    """
    DELETE /admin/reading/<id>
    Delete a test and all its attempts.
    """
    test = ReadingTest.query.get(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    db.session.delete(test)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Test deleted',
    })


@reading_admin_bp.route('/upload-image', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def upload_image():
    """
    POST /admin/reading/upload-image
    Upload a diagram image for use in reading tests.
    Returns the relative path to the uploaded image.
    """
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_image(file.filename):
        return jsonify({'success': False, 'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'}), 400

    filename = secure_filename(file.filename)
    upload_dir = os.path.join(current_app.static_folder, 'images', 'reading')
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    return jsonify({
        'success': True,
        'path': f'/static/images/reading/{filename}',
    })
