from models import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    # Role Constants
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_SUPER_ADMIN = 'super_admin'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default=ROLE_STUDENT, nullable=False)
    target_band = db.Column(db.Float, default=7.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    evaluations = db.relationship('EvaluationResult', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def initials(self):
        parts = self.full_name.strip().split()
        return (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else parts[0][:2].upper()


class EvaluationResult(db.Model):
    __tablename__ = 'evaluation_results'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    module = db.Column(db.String(50), nullable=False)   # e.g. 'task1_academic', 'speaking_part1'
    band_score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
