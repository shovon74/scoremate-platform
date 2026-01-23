from google import genai
import json
import re
from config import Config

class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=Config.GEMINI_API_KEY)

    def check_ielts_writing_task2(self, question, answer):
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
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"

    def check_spelling_grammar(self, answer):
        """
        Use Gemini to identify spelling and grammar errors
        """
        prompt = f"""
        Analyze this text for spelling and grammar errors. Return ONLY a valid JSON array.
        
        Text: {answer}
        
        For each error found, create a JSON object with these fields:
        - "error": the misspelled or incorrect word/phrase
        - "correction": the correct spelling or form
        - "type": either "spelling" or "grammar"
        - "pos": part of speech (noun, verb, adjective, adverb, pronoun, preposition, etc.)
        - "example": a short example sentence using the correct form
        
        Return ONLY the JSON array, nothing else. Format:
        [
            {{"error": "recieve", "correction": "receive", "type": "spelling", "pos": "verb", "example": "I will receive the package tomorrow."}},
            {{"error": "thier", "correction": "their", "type": "spelling", "pos": "pronoun", "example": "They left their books on the table."}}
        ]
        
        If no errors found, return an empty array: []
        
        IMPORTANT: Return ONLY valid JSON, no explanations or markdown.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            text = response.text.strip()
            
            # Remove markdown code blocks if present
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'^```\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            text = text.strip()
            
            # Parse JSON
            errors = json.loads(text)
            return errors if isinstance(errors, list) else []
            
        except Exception as e:
            print(f"Error in spelling/grammar check: {str(e)}")
            return []

# Singleton instance
gemini_service = GeminiService()
