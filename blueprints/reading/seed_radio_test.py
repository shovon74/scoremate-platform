"""
Seed script — Pattern 1: Radio Button (TFNG, YNNG, MCQ Single)

Run from the project root:
    python blueprints/reading/seed_radio_test.py

Creates (or replaces) the published test with slug 'pattern1-radio-test'.
Three question groups:
  Q1–5   tfng        (TRUE / FALSE / NOT GIVEN)
  Q6–10  ynng        (YES / NO / NOT GIVEN)
  Q11–15 mcq_single  (A/B/C/D with custom text; some with subtext)
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import app
from models import db
from models.reading import ReadingTest

SLUG = 'pattern1-radio-test'

TEST_JSON = {
    "parts": [
        {
            "part_number": 1,
            "passage": {
                "title": "AI, Climate Science & Urban Transport",
                "sections": [
                    {
                        "label": "A",
                        "heading": "Artificial Intelligence and Society",
                        "paragraphs": [
                            "Artificial Intelligence represents one of the greatest technological achievements "
                            "of our time. From humble beginnings in the 1950s to today's advanced machine "
                            "learning systems, AI has fundamentally transformed how we work, communicate, "
                            "and solve complex problems. Early pioneers like Alan Turing and Marvin Minsky "
                            "established the theoretical foundations that would guide decades of research.",
                            "The journey has not been without challenges. The initial enthusiasm of the AI "
                            "community was tempered by the limitations of early computing power and the "
                            "complexity of human cognition. These setbacks led to periods known as 'AI "
                            "winters', when funding dried up and progress seemed to stall. However, each "
                            "cycle of dormancy was followed by renewed breakthroughs as technology advanced.",
                            "Modern AI systems leverage vast datasets and sophisticated algorithms to achieve "
                            "remarkable feats. Computer vision now matches or exceeds human capability in many "
                            "domains. Yet, as these systems become more powerful, important questions about "
                            "ethics, privacy, and societal impact have come to the forefront."
                        ]
                    },
                    {
                        "label": "B",
                        "heading": "Climate Science Perspectives",
                        "paragraphs": [
                            "Climate scientists across the globe maintain a compelling consensus on the reality "
                            "of climate change driven by human activity. The evidence encompasses temperature "
                            "records, ice core data, and contemporary observations of glacial retreat and sea "
                            "level rise, all pointing toward accelerating climatic disruption.",
                            "Policymakers face difficult choices when implementing climate mitigation strategies. "
                            "Some emphasise that renewable energy transitions require substantial upfront "
                            "investments. Others argue that the costs of inaction will far exceed transition "
                            "expenses. International cooperation remains challenging despite shared concerns."
                        ]
                    },
                    {
                        "label": "C",
                        "heading": "Urban Transportation Evolution",
                        "paragraphs": [
                            "Modern cities face unprecedented transportation challenges as urban populations "
                            "expand and environmental concerns mount. Historically, the automobile dominated "
                            "city planning throughout the 20th century, reshaping metropolitan areas around "
                            "car-centric infrastructure. This approach has created chronic congestion, air "
                            "quality deterioration, and sprawling development patterns.",
                            "Progressive urban centres are now implementing multi-modal transportation systems "
                            "that integrate walking, cycling, public transit, and selective vehicle access. "
                            "Copenhagen and Amsterdam have pioneered comprehensive cycling infrastructure, "
                            "while Zurich and Tokyo maintain efficient public transit networks.",
                            "Emerging micro-mobility technologies including e-scooters and bike-sharing "
                            "services offer last-mile connection options. These systems show promise but "
                            "require careful regulation to prevent sidewalk clutter and ensure equitable "
                            "access for all income levels."
                        ]
                    }
                ]
            },
            "question_groups": [
                # ── 1. tfng (Q1–5) ─────────────────────────────────────────────
                {
                    "group_id": "g1",
                    "type": "tfng",
                    "question_range": "1-5",
                    "instructions": (
                        "Do the following statements agree with the information given in the passage? "
                        "Write TRUE, FALSE, or NOT GIVEN."
                    ),
                    "questions": [
                        {
                            "number": 1,
                            "text": "Alan Turing was among the early pioneers of AI research.",
                            "answer": "TRUE"
                        },
                        {
                            "number": 2,
                            "text": "AI winters occurred because of a lack of public interest.",
                            "answer": "FALSE"
                        },
                        {
                            "number": 3,
                            "text": "Marvin Minsky received a Nobel Prize for his contributions to AI.",
                            "answer": "NOT GIVEN"
                        },
                        {
                            "number": 4,
                            "text": "Modern AI systems require vast datasets to function effectively.",
                            "answer": "TRUE"
                        },
                        {
                            "number": 5,
                            "text": "Privacy concerns are considered relevant to current AI development.",
                            "answer": "TRUE"
                        }
                    ]
                },

                # ── 2. ynng (Q6–10) ────────────────────────────────────────────
                {
                    "group_id": "g2",
                    "type": "ynng",
                    "question_range": "6-10",
                    "instructions": (
                        "Do the following statements agree with the views of the writer? "
                        "Write YES, NO, or NOT GIVEN."
                    ),
                    "questions": [
                        {
                            "number": 6,
                            "text": "Scientists from different backgrounds agree on human-caused climate change.",
                            "answer": "YES"
                        },
                        {
                            "number": 7,
                            "text": "Glacial retreat provides evidence for current climate disruption.",
                            "answer": "YES"
                        },
                        {
                            "number": 8,
                            "text": "Energy transition costs will exceed the expenses of climate inaction.",
                            "answer": "NO"
                        },
                        {
                            "number": 9,
                            "text": "Developing nations should bear greater financial responsibility for climate action.",
                            "answer": "NOT GIVEN"
                        },
                        {
                            "number": 10,
                            "text": "International climate agreements have been fully successful.",
                            "answer": "NOT GIVEN"
                        }
                    ]
                },

                # ── 3. mcq_single (Q11–15) ─────────────────────────────────────
                {
                    "group_id": "g3",
                    "type": "mcq_single",
                    "question_range": "11-15",
                    "instructions": "Choose the correct letter, A, B, C or D.",
                    "questions": [
                        {
                            "number": 11,
                            "text": "What was the primary focus of city planning in the 20th century?",
                            "options": [
                                {"letter": "A", "text": "Environmental Protection",
                                 "subtext": "Cities prioritised natural habitat preservation."},
                                {"letter": "B", "text": "Automobile-Centred Development",
                                 "subtext": "Infrastructure was designed primarily for cars."},
                                {"letter": "C", "text": "Public Transit Expansion",
                                 "subtext": "Cities invested heavily in railway systems."},
                                {"letter": "D", "text": "Pedestrian Infrastructure",
                                 "subtext": "Walking paths received significant funding."}
                            ],
                            "answer": "B"
                        },
                        {
                            "number": 12,
                            "text": "According to the passage, what has resulted from car-centric city planning?",
                            "options": [
                                {"letter": "A", "text": "Improved air quality"},
                                {"letter": "B", "text": "Urban sprawl and congestion"},
                                {"letter": "C", "text": "Stronger community connections"},
                                {"letter": "D", "text": "Lower transportation costs"}
                            ],
                            "answer": "B"
                        },
                        {
                            "number": 13,
                            "text": "Which cities are mentioned as successful models for cycling infrastructure?",
                            "options": [
                                {"letter": "A", "text": "Berlin and Vienna"},
                                {"letter": "B", "text": "Copenhagen and Amsterdam"},
                                {"letter": "C", "text": "London and Paris"},
                                {"letter": "D", "text": "Sydney and Melbourne"}
                            ],
                            "answer": "B"
                        },
                        {
                            "number": 14,
                            "text": "What concern is raised about micro-mobility technologies?",
                            "options": [
                                {"letter": "A", "text": "They are too expensive."},
                                {"letter": "B", "text": "They require careful regulation and equity consideration."},
                                {"letter": "C", "text": "They cannot integrate with transit."},
                                {"letter": "D", "text": "They are only suitable for wealthy areas."}
                            ],
                            "answer": "B"
                        },
                        {
                            "number": 15,
                            "text": "What is essential for sustainable cities according to the passage?",
                            "options": [
                                {"letter": "A", "text": "Complete elimination of automobiles"},
                                {"letter": "B", "text": "Integration with conventional transit and thoughtful design"},
                                {"letter": "C", "text": "Government subsidies for private cars"},
                                {"letter": "D", "text": "Unrestricted urban expansion"}
                            ],
                            "answer": "B"
                        }
                    ]
                }
            ]
        }
    ]
}


def seed():
    with app.app_context():
        existing = ReadingTest.query.filter_by(slug=SLUG).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print(f"Deleted existing test: {SLUG}")

        test = ReadingTest(
            title="Pattern 1: Radio Button (TFNG / YNNG / MCQ Single)",
            slug=SLUG,
            category="academic",
            source_book="ScoreMate Dev Test",
            total_questions=15,
            time_limit=60,
            test_json=TEST_JSON,
            is_published=True,
        )
        db.session.add(test)
        db.session.commit()
        print(f"Seeded test '{test.title}' with slug '{SLUG}' (id={test.id})")
        print("Questions: 1-5 tfng | 6-10 ynng | 11-15 mcq_single")


if __name__ == '__main__':
    seed()
