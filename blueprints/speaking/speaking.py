from flask import Blueprint, request, jsonify
from services.gemini_service import gemini_service

speaking_bp = Blueprint('speaking', __name__)

@speaking_bp.route('/generate', methods=['POST'])
def generate_sample():
    try:
        data = request.get_json()
        part = data.get('part', 1)
        topic = data.get('topic', '').strip()
        ideas = data.get('ideas', '').strip()
        
        if not topic:
            return jsonify({'success': False, 'error': 'Topic is required'})
            
        sample = gemini_service.generate_ielts_speaking_sample(part, topic, ideas)
        
        return jsonify({
            'success': True,
            'sample': sample
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@speaking_bp.route('/evaluate', methods=['POST'])
def evaluate_speaking():
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.get_json()
            part = data.get('part', 1)
            topic = data.get('topic', '').strip()
            transcript = data.get('transcript', '').strip()
            audio_file = None
        else:
            # FormData (for audio uploads)
            part = request.form.get('part', 1)
            topic = request.form.get('topic', '').strip()
            transcript = request.form.get('transcript', '').strip()
            audio_file = request.files.get('audio_file')
        
        if not topic:
            return jsonify({'success': False, 'error': 'Topic is required'})
            
        if not transcript and not audio_file:
            return jsonify({'success': False, 'error': 'Either a transcript or an audio file is required'})
            
        evaluation = gemini_service.evaluate_ielts_speaking(part, topic, transcript, audio_file)
        
        return jsonify({
            'success': True,
            'evaluation': evaluation
        })
            
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': f"Evaluation Error: {str(e)}"})




