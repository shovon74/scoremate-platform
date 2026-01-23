from flask import Blueprint, request, jsonify
from services.gemini_service import gemini_service

writing_task1_bp = Blueprint('writing_task1', __name__)

@writing_task1_bp.route('/check', methods=['POST'])
def check_writing():
    # Placeholder for Writing Task 1 logic (Reports/Letters)
    return jsonify({
        'success': False,
        'error': 'Writing Task 1 evaluation is currently under development.'
    })
