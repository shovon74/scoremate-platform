from flask import Blueprint, request, jsonify
from services.gemini_service import gemini_service

writing_task1_bp = Blueprint('writing_task1', __name__)

@writing_task1_bp.route('/check', methods=['POST'])
@writing_task1_bp.route('/check/<task_type>', methods=['POST'])
def check_writing(task_type='academic'):
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.get_json()
            question = data.get('question', '').strip()
            answer = data.get('answer', '').strip()
            task_type = data.get('task_type', task_type)
            image_file = None
        else:
            # FormData
            question = request.form.get('question', '').strip()
            answer = request.form.get('answer', '').strip()
            task_type = request.form.get('task_type', task_type)
            image_file = request.files.get('chart_image')

        if not question or not answer:
            return jsonify({
                'success': False,
                'error': 'Both question and answer are required'
            })
        
        # Check minimum word count
        word_count = len(answer.split())
        
        # Get feedback from Gemini
        if task_type == 'general':
            feedback = gemini_service.check_ielts_writing_task1_general(question, answer)
        else:
            # Academic (Multimodal)
            feedback = gemini_service.check_ielts_writing_task1(question, answer, task_type, image_file)

        
        # Get spelling and grammar errors
        spelling_errors = gemini_service.check_spelling_grammar(answer)
        
        return jsonify({
            'success': True,
            'feedback': feedback,
            'word_count': word_count,
            'spelling_errors': spelling_errors,
            'task_type': task_type
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        })


