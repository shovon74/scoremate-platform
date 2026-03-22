from models import db
from uuid import uuid4
from datetime import datetime


class ReadingTest(db.Model):
    __tablename__ = 'reading_test'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    category = db.Column(db.String(20))  # "academic" | "general"
    source_book = db.Column(db.String(100))
    total_questions = db.Column(db.Integer, default=40)
    time_limit = db.Column(db.Integer, default=60)  # minutes
    test_json = db.Column(db.JSON, nullable=False)  # Full JSON blob
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    attempts = db.relationship('ReadingAttempt', backref='test', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<ReadingTest {self.slug}>'


class ReadingAttempt(db.Model):
    __tablename__ = 'reading_attempt'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    test_id = db.Column(db.String(36), db.ForeignKey('reading_test.id'), nullable=False)
    answers_json = db.Column(db.JSON)  # {question_number: user_answer}
    score = db.Column(db.Integer)  # raw correct count
    band_score = db.Column(db.Float)
    time_taken = db.Column(db.Integer)  # seconds
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to User
    user = db.relationship('User', backref=db.backref('reading_attempts', lazy=True))

    def __repr__(self):
        return f'<ReadingAttempt {self.id} score={self.score}>'
