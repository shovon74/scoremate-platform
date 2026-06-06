from models import db
from uuid import uuid4
from datetime import datetime


class ListeningTest(db.Model):
    __tablename__ = 'listening_test'

    id              = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title           = db.Column(db.String(200), nullable=False)
    slug            = db.Column(db.String(200), unique=True, nullable=False)
    category        = db.Column(db.String(20))          # "academic" | "general"
    source_book     = db.Column(db.String(100))
    total_questions = db.Column(db.Integer, default=40)
    time_limit      = db.Column(db.Integer, default=30) # minutes (default 30 for listening)
    has_transcript  = db.Column(db.Boolean, default=False)  # True when admin enables "Locate Question"
    test_json       = db.Column(db.JSON, nullable=False)    # Full test structure (see schema in plan)
    is_published    = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    # Cascade delete attempts when test is deleted
    attempts = db.relationship(
        'ListeningAttempt',
        backref='test',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<ListeningTest {self.slug}>'


class ListeningAttempt(db.Model):
    __tablename__ = 'listening_attempt'

    id           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    test_id      = db.Column(db.String(36), db.ForeignKey('listening_test.id'), nullable=False)
    answers_json = db.Column(db.JSON)    # {question_number: user_answer}  e.g. {"1": "kings", "11": ["B","C"]}
    score        = db.Column(db.Integer) # raw correct count out of total_questions
    band_score   = db.Column(db.Float)   # IELTS band 0.0 – 9.0
    time_taken   = db.Column(db.Integer) # seconds elapsed

    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship back to User
    user = db.relationship('User', backref=db.backref('listening_attempts', lazy=True))

    def __repr__(self):
        return f'<ListeningAttempt {self.id} score={self.score}>'
