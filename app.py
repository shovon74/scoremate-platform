from flask import Flask, render_template
from flask_login import LoginManager, login_required, current_user
from config import Config
from models import db
from flask_cors import CORS
from blueprints.writing.task2 import writing_task2_bp
from blueprints.writing.task1 import writing_task1_bp
from blueprints.speaking.speaking import speaking_bp
from blueprints.auth.auth import auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    # Initialize database
    db.init_app(app)

    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please sign in to access ScoreMate.'
    login_manager.login_message_category = 'info'

    @login_manager.user_loader
    def load_user(user_id):
        from models.user import User
        return User.query.get(int(user_id))

    # Create tables (for development)
    with app.app_context():
        from models.user import User, EvaluationResult  # ensure models are registered
        from models.reading import ReadingTest, ReadingAttempt
        db.create_all()

    # Register Blueprints
    app.register_blueprint(writing_task2_bp, url_prefix='/api/writing/task2')
    app.register_blueprint(writing_task1_bp, url_prefix='/api/writing/task1')
    app.register_blueprint(speaking_bp, url_prefix='/api/speaking')
    from blueprints.admin.admin import admin_bp
    from blueprints.reading.reading_api import reading_api_bp
    from blueprints.reading.reading_admin import reading_admin_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(reading_api_bp, url_prefix='/api/reading')
    app.register_blueprint(reading_admin_bp, url_prefix='/admin/reading')

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    @app.route('/test-admin')
    @login_required
    def test_admin():
        from utils.decorators import role_required
        from models.user import User

        @role_required(User.ROLE_SUPER_ADMIN)
        def protected_view():
            return "Welcome, Super Admin!"
            
        return protected_view()

    @app.route('/dashboard')
    @login_required
    def dashboard():
        from models.user import EvaluationResult
        # Gather stats per module
        modules = [
            ('task1_academic', 'Writing Task 1 (Academic)'),
            ('task1_general', 'Writing Task 1 (General)'),
            ('task2', 'Writing Task 2'),
            ('speaking_part1', 'Speaking Part 1'),
            ('speaking_part2', 'Speaking Part 2'),
            ('speaking_part3', 'Speaking Part 3'),
        ]
        stats = []
        for module_id, module_name in modules:
            results = EvaluationResult.query.filter_by(
                user_id=current_user.id, module=module_id
            ).order_by(EvaluationResult.created_at.desc()).all()
            last_score = results[0].band_score if results else None
            stats.append({
                'id': module_id,
                'name': module_name,
                'attempts': len(results),
                'last_score': last_score,
            })
        return render_template('dashboard.html', stats=stats)

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=Config.DEBUG)