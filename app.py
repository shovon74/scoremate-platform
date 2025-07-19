from flask import Flask, request, render_template, jsonify
from google import genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize Gemini client
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

def check_ielts_writing(question, answer):
    """
    Use Gemini to check IELTS Writing Task 2 answer
    """
    prompt = f"""
    Check this IELTS Writing Task 2 answer. Give feedback in very simple English. Each section should be maximum 90 words.
    
    Question: {question}
    
    Answer: {answer}
    
    Give scores and detailed feedback for each area:
    1. Task Achievement (0-9): Does it answer the question?
    2. Coherence and Cohesion (0-9): Is it well organized?
    3. Lexical Resource (0-9): Good vocabulary use?
    4. Grammatical Range and Accuracy (0-9): Grammar correct?
    
    Format like this:
    **Overall Band Score: X.X**
    
    **Task Achievement (X/9):** [Maximum 90 words of feedback in simple English]
    
    **Coherence and Cohesion (X/9):** [Maximum 90 words of feedback in simple English]
    
    **Lexical Resource (X/9):** [Maximum 90 words of feedback in simple English]
    
    **Grammar (X/9):** [Maximum 90 words of feedback in simple English]
    
    **Main Tips:** [Maximum 90 words of improvement tips in simple English]
    
    Use simple words and short sentences. Each section can be up to 90 words but use simple English only.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check', methods=['POST'])
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
        feedback = check_ielts_writing(question, answer)
        
        return jsonify({
            'success': True,
            'feedback': feedback,
            'word_count': word_count
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True)