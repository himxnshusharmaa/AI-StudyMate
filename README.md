# 📚 AI StudyMate
Upload a PDF or paste notes → get notes, topics, MCQs, short/long questions, flashcards and a mock test.
**Stack:** React + Vite + Tailwind · FastAPI · Supabase (auth + DB) · OpenAI · PyMuPDF · Recharts

## Structure
- `backend/main.py` – API routes, PDF extraction (PyMuPDF), free-plan limits
- `backend/ai.py` – one function + prompt per content type (`generate_notes`, `generate_mcqs`, …)
- `frontend/src/App.jsx` – all pages; `api.js` – Supabase + API helper
- `supabase/schema.sql` – database tables

## Setup
1. **Install dependencies**
   - Backend: `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
   - Frontend: `cd frontend && npm install`
2. **Create the Supabase project**
   - Create a project at supabase.com → **SQL Editor** → paste and run `supabase/schema.sql`.
   - **Project Settings → API**: copy the URL, the `anon` key and the `service_role` key.
   - (Optional for testing) **Authentication → Providers → Email**: turn off "Confirm email".
3. **Add your keys**: copy `.env.example` to `backend/.env` (backend values) and `frontend/.env` (the `VITE_` values). Never commit these; the `service_role` and OpenAI keys stay in the backend only.
4. **Run**: `uvicorn main:app --reload` (in `backend`, port 8000) and `npm run dev` (in `frontend`, open http://localhost:5173).

## Free plan
3 new documents per calendar month, 3 generated quizzes (MCQ/mock) per document → friendly upgrade message (HTTP 402). The Pro page is a placeholder.

## Known limits
Scanned (image-only) PDFs are rejected – no OCR. Very long PDFs use only the first ~6 chunks (~72k characters) to control cost.
