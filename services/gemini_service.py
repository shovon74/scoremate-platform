from google import genai
from google.genai import types
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
        1. Task Response (0-9): Does it answer the question?
        2. Coherence and Cohesion (0-9): Is it well organized?
        3. Lexical Resource (0-9): Good vocabulary use?
        4. Grammatical Range and Accuracy (0-9): Grammar correct?
        
        Format like this:
        **Overall Band Score: X.X**
        
        **Task Response (X/9):** [Maximum 90 words of feedback in simple English]
        
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

    def check_ielts_writing_task1(self, question, answer, task_type='academic', image_file=None):
        """
        Use Gemini to check IELTS Writing Task 1 answer (Academic or General)
        Supports Multimodal input (Images) for charts/diagrams.
        """
        # Define Task 1 Specific Standards based on Cambridge/British Council
        standard_info = """
        IELTS Academic Writing Task 1 Requirements:
        - Time: Suggested 20 minutes
        - Length: Minimum 150 words
        - Content: Describe visual data (graph, chart, table, map, or diagram).
        - Objective: Factual, objective, and accurate.
        - Structure: Introduction (paraphrase), Overview (main trends), 2-3 body paragraphs (specific data).
        - Scoring focus: Task Achievement, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
        """

        prompt = f"""
        {standard_info}
        
        Evaluate this IELTS Academic Writing Task 1 Report based on the provided Question/Topic and Answer.
        If an image of the chart/diagram is provided, analyze it to verify the accuracy of the report's data.
        
        Question/Topic: {question}
        
        Answer: {answer}
        
        Evaluate each area (0-9):
        1. Task Achievement: Did they provide a clear overview and report main features accurately?
        2. Coherence and Cohesion: Is the organization logical and ideas linked effectively?
        3. Lexical Resource: Is there varied and appropriate vocabulary?
        4. Grammatical Range and Accuracy: Are structures varied and errors minimized?
        
        Format your response like this:
        **Overall Band Score: X.X**
        
        **Task Achievement (X/9):** [Feedback on data accuracy and overview]
        
        **Coherence and Cohesion (X/9):** [Feedback on organization]
        
        **Lexical Resource (X/9):** [Feedback on vocabulary]
        
        **Grammar (X/9):** [Feedback on sentence structures]
        
        **Main Tips:** [Actionable improvements in simple English]
        """
        
        try:
            parts = [types.Part.from_text(text=prompt)]
            
            # Add image to multimodal prompt if provided
            if image_file:
                # Reset pointer just in case
                image_file.seek(0)
                image_data = image_file.read()
                parts.append(types.Part.from_bytes(
                    data=image_data,
                    mime_type=image_file.content_type
                ))

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=types.Content(role="user", parts=parts)
            )

            return response.text

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return f"Error: {str(e)}"


    def check_ielts_writing_task1_general(self, question, answer):
        """
        Use Gemini to check IELTS General Writing Task 1 answer (Letter)
        """
        standard_info = """
        IELTS General Training Writing Task 1 Requirements:
        - Time: Suggested 20 minutes
        - Length: Minimum 150 words
        - Content: Write a letter based on an everyday scenario (complaining, requesting, apologizing, etc.).
        - Tone: Must be consistent (Formal, Semi-formal, or Informal) based on the recipient.
        - Structure: Must include suitable salutation, opening statement of purpose, three paragraphs covering the bullet points, and a polite closing.
        - Scoring focus: Task Achievement (covering all 3 bullet points), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
        """

        prompt = f"""
        {standard_info}
        
        Evaluate this IELTS General Training Writing Task 1 Letter based on the provided Scenario/Topic and the student's Answer.
        
        Scenario: {question}
        
        Answer: {answer}
        
        Evaluate each area (0-9):
        1. Task Achievement: Did they cover all three bullet points? Is the tone appropriate and consistent? Is the purpose clear?
        2. Coherence and Cohesion: Is the letter well-organized? Are transition words used naturally?
        3. Lexical Resource: Is the vocabulary varied and suitable for the tone?
        4. Grammatical Range and Accuracy: Are structures varied and errors minimized?
        
        Format your response like this in simple English:
        **Overall Band Score: X.X**
        
        **Task Achievement (X/9):** [Feedback on tone, purpose, and bullet points]
        
        **Coherence and Cohesion (X/9):** [Feedback on organization and flow]
        
        **Lexical Resource (X/9):** [Feedback on vocabulary use]
        
        **Grammar (X/9):** [Feedback on sentence structures and accuracy]
        
        **Main Tips:** [Actionable improvements for this letter]
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

    def generate_ielts_speaking_sample(self, part, topic, ideas=""):
        """
        Generate a Band 9 sample answer for IELTS Speaking Part 1, 2, or 3
        """
        prompt = f"""
        Act as an IELTS Band 9 candidate. Generate a high-scoring sample answer for IELTS Speaking Part {part}.
        
        Topic/Question: {topic}
        Optional Ideas to include: {ideas}
        
        Requirements:
        - Part 1: Provide a concise, natural, and friendly answer (3-4 sentences).
        - Part 2: Provide a full 2-minute "long turn" response (approx 200-250 words) with clear structure.
        - Part 3: Provide a detailed, abstract, and well-justified response (approx 100-150 words).
        
        Use natural fillers (like "well", "actually", "to be honest") where appropriate to sound like a native speaker.
        Ensure complex grammatical structures and high-level vocabulary are used naturally.
        
        Return ONLY the sample answer text.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            return f"Error generating sample: {str(e)}"

    def evaluate_ielts_speaking(self, part, topic, transcript, audio_file=None):
        """
        Evaluate an IELTS Speaking answer based on a transcript and optional audio.
        """
        prompt = f"""
        Act as an IELTS Speaking Examiner. Evaluate this IELTS Speaking Part {part} response.
        
        Topic: {topic}
        Transcript (for reference): {transcript}
        
        If audio is provided, listen carefully to assess pronunciation, intonation, and fluency.
        
        Provide scores (0-9) and detailed feedback for IELTS criteria.
        
        Format your response ONLY as a valid JSON object with these EXACT fields:
        {{
            "overall_band": 7.5,
            "fluency_score": 7.0,
            "lexical_score": 8.0,
            "grammar_score": 7.5,
            "pronunciation_score": 7.0,
            "fluency_feedback": "Short feedback on fluency...",
            "lexical_feedback": "Short feedback on vocabulary...",
            "grammar_feedback": "Short feedback on grammar...",
            "pronunciation_feedback": "Short feedback on pronunciation...",
            "repetitive_words": ["actually", "basically", "like"],
            "polished_transcript": "A band 9 version of the answer...",
            "main_tips": ["Tip 1", "Tip 2"]
        }}
        
        For "repetitive_words", identify 3-5 words or short phrases that the speaker overuses unnaturally (e.g., "like", "you know", "actually"). If none, return an empty list.
        
        Do not include any text before or after the JSON.

        """
        
        parts = [types.Part.from_text(text=prompt)]
        
        if audio_file:
            audio_file.seek(0)
            audio_data = audio_file.read()
            # Ensure we have a valid mime type, default to audio/webm if missing
            mime_type = audio_file.content_type or 'audio/webm'
            parts.append(types.Part.from_bytes(
                data=audio_data,
                mime_type=mime_type
            ))

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=types.Content(role="user", parts=parts)
        )
        
        # Robust JSON parsing
        res_text = response.text.strip()
        print(f"DEBUG: AI Speaking raw response: {res_text}")
        
        # Strip markdown if present
        if "```" in res_text:
            import re
            res_text = re.sub(r'^```(?:json)?\s*', '', res_text)
            res_text = re.sub(r'\s*```$', '', res_text)
            res_text = res_text.strip()
            
        return json.loads(res_text)





# Singleton instance
gemini_service = GeminiService()
