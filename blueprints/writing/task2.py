from flask import Blueprint, request, jsonify
from services.gemini_service import gemini_service

writing_task2_bp = Blueprint('writing_task2', __name__)

@writing_task2_bp.route('/check', methods=['POST'])
def check_writing():
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        
        if not question or not answer:
            return jsonify({
                'success': False,
                'error': 'Both question and answer are required'
            })
        
        # Check minimum word count (IELTS Task 2 requires minimum 250 words)
        word_count = len(answer.split())
        if word_count < 100:
            return jsonify({
                'success': False,
                'error': f'Answer too short. Current: {word_count} words. Minimum recommended: 250 words.'
            })
        
        # Get feedback from Gemini
        feedback = gemini_service.check_ielts_writing_task2(question, answer)
        
        # Get spelling and grammar errors
        spelling_errors = gemini_service.check_spelling_grammar(answer)
        
        return jsonify({
            'success': True,
            'feedback': feedback,
            'word_count': word_count,
            'spelling_errors': spelling_errors
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@writing_task2_bp.route('/generate', methods=['POST'])
def generate_essay():
    try:
        data = request.get_json()
        topic = data.get('topic', '').strip()
        ideas = data.get('ideas', '').strip()
        num_paragraphs = int(data.get('num_paragraphs', 3))
        
        if not topic:
            return jsonify({
                'success': False,
                'error': 'Topic is required'
            })
            
        essay = gemini_service.generate_ielts_writing_task2_essay(topic, ideas, num_paragraphs)
        
        return jsonify({
            'success': True,
            'essay': essay
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })
