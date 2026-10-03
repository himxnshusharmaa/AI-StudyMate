"""AI functions. Each has its own prompt and returns JSON the frontend can render."""
import json, os
from dotenv import load_dotenv
from openai import OpenAI
load_dotenv()
client = OpenAI()  # reads OPENAI_API_KEY from the environment - never hardcode it
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
CHUNK, MAX_CHUNKS = 12000, 6  # long PDFs are split into chunks to fit the model limit
RULES = ("Use ONLY the study material given. Never invent facts. Use simple language, "
         "suitable for college exams. Reply with valid JSON only.")

def _ask(task, text):
    r = client.chat.completions.create(model=MODEL, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": RULES}, {"role": "user", "content": f"{task}\n\nMATERIAL:\n{text}"}])
    return json.loads(r.choices[0].message.content)

def _run(task, text, key):
    """Run the task on each chunk, then merge the results."""
    parts = [text[i:i + CHUNK] for i in range(0, len(text), CHUNK)][:MAX_CHUNKS]
    merged = None
    for p in parts:
        val = _ask(task, p).get(key, [])
        merged = val if merged is None else (merged + val if isinstance(val, list) else f"{merged}\n\n{val}")
    return {key: merged}

MCQ = 'JSON {"questions":[{"question":str,"options":[4 strings],"answer":index 0-3,"topic":str,"explanation":str}]}'

def generate_notes(t): return _run('Write simple notes with headings and bullet points (markdown). JSON {"notes":str}', t, "notes")
def generate_important_topics(t): return _run('List important exam topics. JSON {"topics":[{"topic":str,"why":str}]}', t, "topics")
def generate_mcqs(t): return _run(f"Write 8 MCQs. {MCQ}", t, "questions")
def generate_short_questions(t): return _run('Write 5 short-answer questions with 2-3 line answers. JSON {"questions":[{"question":str,"answer":str}]}', t, "questions")
def generate_long_questions(t): return _run('Write 3 long-answer questions with detailed bullet-point answers. JSON {"questions":[{"question":str,"answer":str}]}', t, "questions")
def generate_flashcards(t): return _run('Make 10 flashcards. JSON {"cards":[{"front":str,"back":str}]}', t, "cards")
def generate_mock_test(t):
    r = _run(f"Create a mixed-difficulty mock exam of 10 MCQs. {MCQ}", t[:CHUNK * 3], "questions")
    r["questions"] = r["questions"][:15]; return r

KINDS = {"notes": generate_notes, "topics": generate_important_topics, "mcqs": generate_mcqs,
         "short": generate_short_questions, "long": generate_long_questions,
         "flashcards": generate_flashcards, "mock": generate_mock_test}
