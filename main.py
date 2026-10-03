"""FastAPI backend. Run: uvicorn main:app --reload"""
import os, datetime
import fitz  # PyMuPDF
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from ai import KINDS
load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
app = FastAPI(title="AI StudyMate")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
MAX_DOCS_PER_MONTH, MAX_QUIZZES_PER_DOC, MAX_MB = 3, 3, 15

def user_id(authorization: str = Header(None)):
    """Verify the Supabase login token sent by the frontend."""
    try:
        return sb.auth.get_user(authorization.replace("Bearer ", "")).user.id
    except Exception:
        raise HTTPException(401, "Please log in again.")

def check_doc_limit(uid):
    start = datetime.date.today().replace(day=1).isoformat()
    n = sb.table("documents").select("id", count="exact").eq("user_id", uid).gte("created_at", start).execute().count
    if n >= MAX_DOCS_PER_MONTH:
        raise HTTPException(402, "Free plan: 3 documents per month. Upgrade to Pro for more!")

def save_doc(uid, name, text):
    if len(text.strip()) < 50:
        raise HTTPException(400, "No readable text found. Scanned PDFs are not supported yet.")
    return sb.table("documents").insert({"user_id": uid, "name": name, "text": text}).execute().data[0]

@app.post("/api/documents/upload")
async def upload(file: UploadFile = File(...), uid: str = Depends(user_id)):
    data = await file.read()
    if not (file.filename or "").lower().endswith(".pdf") or data[:5] != b"%PDF-":
        raise HTTPException(400, "Please upload a valid PDF file.")
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_MB} MB).")
    check_doc_limit(uid)
    try:
        text = "\n".join(p.get_text() for p in fitz.open(stream=data, filetype="pdf"))
    except Exception:
        raise HTTPException(400, "Could not read this PDF.")
    d = save_doc(uid, file.filename, text)
    return {"id": d["id"], "name": d["name"]}

class TextIn(BaseModel):
    name: str = "Pasted notes"
    text: str

@app.post("/api/documents/text")
def paste(body: TextIn, uid: str = Depends(user_id)):
    check_doc_limit(uid)
    d = save_doc(uid, body.name, body.text)
    return {"id": d["id"], "name": d["name"]}

@app.get("/api/documents")
def documents(uid: str = Depends(user_id)):
    return sb.table("documents").select("id,name,created_at").eq("user_id", uid).order("created_at", desc=True).execute().data

@app.get("/api/documents/{doc_id}")
def document(doc_id: str, uid: str = Depends(user_id)):
    d = sb.table("documents").select("id,name").eq("id", doc_id).eq("user_id", uid).execute().data
    if not d: raise HTTPException(404, "Document not found.")
    g = sb.table("generations").select("kind,content").eq("doc_id", doc_id).order("created_at").execute().data
    return {**d[0], "generated": {x["kind"]: x["content"] for x in g}}  # newest of each kind wins

@app.post("/api/documents/{doc_id}/generate/{kind}")
def generate(doc_id: str, kind: str, uid: str = Depends(user_id)):
    if kind not in KINDS: raise HTTPException(400, "Unknown content type.")
    d = sb.table("documents").select("text").eq("id", doc_id).eq("user_id", uid).execute().data
    if not d: raise HTTPException(404, "Document not found.")
    if kind in ("mcqs", "mock"):  # free plan: 3 quizzes per document
        n = sb.table("generations").select("id", count="exact").eq("doc_id", doc_id).in_("kind", ["mcqs", "mock"]).execute().count
        if n >= MAX_QUIZZES_PER_DOC:
            raise HTTPException(402, "Free plan: 3 quizzes per document. Upgrade to Pro for unlimited!")
    try:
        content = KINDS[kind](d[0]["text"])
    except Exception:
        raise HTTPException(502, "The AI request failed. Please try again.")
    sb.table("generations").insert({"doc_id": doc_id, "user_id": uid, "kind": kind, "content": content}).execute()
    return content

class AttemptIn(BaseModel):
    doc_id: str
    score: int
    total: int
    weak_topics: list[str] = []

@app.post("/api/attempts")
def add_attempt(a: AttemptIn, uid: str = Depends(user_id)):
    return sb.table("attempts").insert({**a.model_dump(), "user_id": uid}).execute().data[0]

@app.get("/api/attempts")
def attempts(uid: str = Depends(user_id)):
    return sb.table("attempts").select("*").eq("user_id", uid).order("created_at", desc=True).execute().data
