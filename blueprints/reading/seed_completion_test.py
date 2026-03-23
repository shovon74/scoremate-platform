"""
Seed script — Pattern 4: Text Input / Completion (all 6 types)

Run from the project root:
    python blueprints/reading/seed_completion_test.py

Creates (or replaces) the published test with slug 'pattern4-completion-test'.
Each of the 6 question groups covers one completion sub-type.
Question numbering: 1-3 summary, 4-6 note, 7-9 sentence, 10-12 table,
                   13-15 flow_chart, 16-18 short_answer.

JSON schema for context_html types:
  - [[N]] markers are replaced at render-time by inline <input> elements.
  - The renderer wraps context_html in the appropriate container div.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import app
from models import db
from models.reading import ReadingTest

SLUG = 'pattern4-completion-test'

TEST_JSON = {
    "parts": [
        {
            "part_number": 1,
            "passage": {
                "title": "Archaeology, Ecosystems & Urban Development",
                "sections": [
                    {
                        "label": "A",
                        "heading": "Archaeological Dating",
                        "paragraphs": [
                            "Modern archaeology employs sophisticated techniques to determine artifact age. "
                            "Radiocarbon dating measures carbon-14 decay in organic materials, providing "
                            "chronological frameworks for specimens up to 50,000 years old. Calibration "
                            "against known specimens ensures accuracy, though contamination can compromise "
                            "results. Stratigraphic analysis examines layering sequences, establishing "
                            "relative chronologies based on deposit positioning.",
                            "Dendrochronology employs tree-ring analysis to establish precise dates. "
                            "Tree rings vary in thickness annually based on growing conditions, creating "
                            "unique patterns that can be matched across centuries. This method provides "
                            "exceptional accuracy and reveals past climate patterns alongside "
                            "archaeological dating."
                        ]
                    },
                    {
                        "label": "B",
                        "heading": "Marine Ecosystems",
                        "paragraphs": [
                            "Ocean ecosystems demonstrate remarkable complexity with organisms interacting "
                            "across multiple trophic levels. Phytoplankton form the foundation, converting "
                            "sunlight through photosynthesis into usable energy. Zooplankton consume these "
                            "microscopic plants, providing food for fish populations. Apex predators "
                            "including sharks and whales maintain population balance through selective "
                            "predation.",
                            "Coral reefs exemplify biodiversity concentration, supporting over 25% of "
                            "marine species despite occupying minimal ocean area. Ocean acidification "
                            "from increased atmospheric carbon dioxide threatens these delicate "
                            "relationships, causing coral bleaching."
                        ]
                    },
                    {
                        "label": "C",
                        "heading": "Global Water Resources",
                        "paragraphs": [
                            "Water distribution across Earth reveals stark inequalities. Saltwater composes "
                            "approximately 97% of planetary water, leaving minimal freshwater for human "
                            "consumption. Of available freshwater, glaciers and ice caps contain roughly "
                            "69%, with groundwater comprising 30%, and lakes and rivers representing only "
                            "1%. Climate change exacerbates these pressures, altering precipitation "
                            "patterns and increasing evaporation."
                        ]
                    },
                    {
                        "label": "D",
                        "heading": "Information Processing",
                        "paragraphs": [
                            "Information flows through modern organisations following predictable patterns. "
                            "Initial collection gathers raw data from diverse sources. Processing converts "
                            "raw data into meaningful information through analysis and categorisation. "
                            "Distribution channels ensure appropriate stakeholders receive relevant "
                            "information. Finally, feedback mechanisms enable system refinement and "
                            "continuous improvement."
                        ]
                    },
                    {
                        "label": "E",
                        "heading": "Urban Poverty",
                        "paragraphs": [
                            "Urban poverty remains a persistent challenge in developing economies. Rapid "
                            "urbanisation outpaces housing construction, forcing populations into informal "
                            "settlements lacking basic services. Microfinance initiatives have demonstrated "
                            "effectiveness in creating economic opportunities, enabling entrepreneurs to "
                            "establish small businesses. Community-based programmes emphasising skills "
                            "development offer sustainable alternatives. Successful interventions require "
                            "coordination between governmental agencies, non-governmental organisations, "
                            "and community stakeholders."
                        ]
                    }
                ]
            },
            "question_groups": [
                # ── 1. summary_completion (Q1–Q3) ──────────────────────────────
                {
                    "group_id": "g1",
                    "type": "summary_completion",
                    "question_range": "1-3",
                    "instructions": "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN TWO WORDS",
                    "context_html": (
                        "<p><strong>Archaeological Dating Methods</strong></p>"
                        "<p>Radiocarbon dating works by measuring <strong>[[1]]</strong> decay in "
                        "organic materials and can date specimens up to 50,000 years old. "
                        "<strong>[[2]]</strong> examines the layering of deposits to establish "
                        "relative chronologies. The third major method, "
                        "<strong>[[3]]</strong>, uses annual tree-ring patterns to achieve "
                        "exceptional dating accuracy.</p>"
                    ),
                    "questions": [
                        {"number": 1, "answer": "carbon-14"},
                        {"number": 2, "answer": "Stratigraphic analysis"},
                        {"number": 3, "answer": "Dendrochronology"},
                    ]
                },

                # ── 2. note_completion (Q4–Q6) ─────────────────────────────────
                {
                    "group_id": "g2",
                    "type": "note_completion",
                    "question_range": "4-6",
                    "instructions": "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN TWO WORDS",
                    "context_html": (
                        "<p><strong>Marine Ecosystem — Key Facts:</strong></p>"
                        "<ul>"
                        "<li>Phytoplankton convert [[4]] into usable energy via photosynthesis</li>"
                        "<li>Apex predators maintain balance through [[5]] predation</li>"
                        "<li>Coral reefs support over 25% of marine species; threatened by "
                        "[[6]], which causes bleaching</li>"
                        "</ul>"
                    ),
                    "questions": [
                        {"number": 4, "answer": "sunlight"},
                        {"number": 5, "answer": "selective"},
                        {"number": 6, "answer": "ocean acidification"},
                    ]
                },

                # ── 3. sentence_completion (Q7–Q9) ─────────────────────────────
                {
                    "group_id": "g3",
                    "type": "sentence_completion",
                    "question_range": "7-9",
                    "instructions": "Complete the sentences below. Write NO MORE THAN TWO WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN TWO WORDS",
                    "questions": [
                        {
                            "number": 7,
                            "text": "Phytoplankton are important because they convert [[7]] into usable energy.",
                            "answer": "sunlight"
                        },
                        {
                            "number": 8,
                            "text": "Coral reefs support more than [[8]] of all marine species.",
                            "answer": "25%"
                        },
                        {
                            "number": 9,
                            "text": "Of all freshwater on Earth, [[9]] contain roughly 69%.",
                            "answer": "glaciers and ice caps"
                        }
                    ]
                },

                # ── 4. table_completion (Q10–Q12) ──────────────────────────────
                {
                    "group_id": "g4",
                    "type": "table_completion",
                    "question_range": "10-12",
                    "instructions": "Complete the table below using NO MORE THAN TWO WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN TWO WORDS",
                    "context_html": (
                        "<table>"
                        "<thead><tr>"
                        "<th>Freshwater Source</th>"
                        "<th>Share of Global Freshwater</th>"
                        "</tr></thead>"
                        "<tbody>"
                        "<tr><td>Glaciers and Ice Caps</td><td>[[10]]</td></tr>"
                        "<tr><td>Groundwater</td><td>[[11]]</td></tr>"
                        "<tr><td>[[12]]</td><td>1%</td></tr>"
                        "</tbody>"
                        "</table>"
                    ),
                    "questions": [
                        {"number": 10, "answer": "roughly 69%"},
                        {"number": 11, "answer": "30%"},
                        {"number": 12, "answer": "lakes and rivers"},
                    ]
                },

                # ── 5. flow_chart_completion (Q13–Q15) ─────────────────────────
                {
                    "group_id": "g5",
                    "type": "flow_chart_completion",
                    "question_range": "13-15",
                    "instructions": "Complete the flow chart below using NO MORE THAN TWO WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN TWO WORDS",
                    "context_html": (
                        '<div class="flowchart-box"><strong>Data Collection</strong><br>'
                        '<small>raw data gathered from diverse sources</small></div>'
                        '<div class="flowchart-arrow">↓</div>'
                        '<div class="flowchart-box">[[13]]<br>'
                        '<small>converts raw data into meaningful information</small></div>'
                        '<div class="flowchart-arrow">↓</div>'
                        '<div class="flowchart-box">Distribution of [[14]]<br>'
                        '<small>reaches appropriate stakeholders</small></div>'
                        '<div class="flowchart-arrow">↓</div>'
                        '<div class="flowchart-box">[[15]] Mechanisms<br>'
                        '<small>enable system refinement</small></div>'
                    ),
                    "questions": [
                        {"number": 13, "answer": "Processing"},
                        {"number": 14, "answer": "information"},
                        {"number": 15, "answer": "Feedback"},
                    ]
                },

                # ── 6. short_answer (Q16–Q18) ───────────────────────────────────
                {
                    "group_id": "g6",
                    "type": "short_answer",
                    "question_range": "16-18",
                    "instructions": "Answer the questions below. Write NO MORE THAN THREE WORDS from the passage for each answer.",
                    "constraint": "NO MORE THAN THREE WORDS",
                    "questions": [
                        {
                            "number": 16,
                            "text": "What problem results from rapid urbanisation outpacing housing construction?",
                            "answer": "informal settlements"
                        },
                        {
                            "number": 17,
                            "text": "Which initiative has demonstrated effectiveness in creating economic opportunities?",
                            "answer": "Microfinance initiatives"
                        },
                        {
                            "number": 18,
                            "text": "Who must coordinate for successful poverty reduction interventions?",
                            "answer": "governmental agencies, non-governmental organisations, and community stakeholders"
                        }
                    ]
                }
            ]
        }
    ]
}


def seed():
    with app.app_context():
        # Remove existing test with the same slug
        existing = ReadingTest.query.filter_by(slug=SLUG).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print(f"Deleted existing test: {SLUG}")

        test = ReadingTest(
            title="Pattern 4: Completion Types (All 6)",
            slug=SLUG,
            category="academic",
            source_book="ScoreMate Dev Test",
            total_questions=18,
            time_limit=60,
            test_json=TEST_JSON,
            is_published=True,
        )
        db.session.add(test)
        db.session.commit()
        print(f"Seeded test '{test.title}' with slug '{SLUG}' (id={test.id})")
        print("Questions: 1-3 summary | 4-6 note | 7-9 sentence | 10-12 table | 13-15 flow_chart | 16-18 short_answer")


if __name__ == '__main__':
    seed()
