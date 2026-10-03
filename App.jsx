import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase, api } from "./api.js";

// Small reusable pieces
const Card = ({ children, className = "" }) => <div className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 ${className}`}>{children}</div>;
const Btn = ({ children, className = "", ...p }) => <button {...p} className={`rounded-full bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 ${className}`}>{children}</button>;
const Err = ({ msg }) => msg ? <p role="alert" className="my-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{msg}</p> : null;

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("landing"); // landing | auth | dashboard | material | quiz | cards | profile | pro
  const [ctx, setCtx] = useState({}); // data passed between pages (current doc, quiz questions...)
  const [dark, setDark] = useState(false);
  const go = (v, c = {}) => { setCtx(c); setView(v); };

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const app = view === "landing" ? <Landing go={go} session={session} />
    : !session ? <Auth go={go} />
    : (
      <div className="flex min-h-screen flex-col md:flex-row">
        <nav className="flex gap-1 border-b border-slate-200 p-3 md:w-52 md:flex-col md:border-b-0 md:border-r dark:border-slate-700">
          <b className="hidden px-3 py-2 text-lg md:block">📚 StudyMate</b>
          {[["dashboard", "Dashboard"], ["profile", "Profile"], ["pro", "Pro"]].map(([k, l]) =>
            <button key={k} onClick={() => go(k)} className={`rounded-lg px-3 py-2 text-left ${view === k ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100" : ""}`}>{l}</button>)}
          <button onClick={() => supabase.auth.signOut().then(() => go("landing"))} className="ml-auto rounded-lg px-3 py-2 md:ml-0 md:mt-auto">Log out</button>
        </nav>
        <main className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">
          {view === "dashboard" && <Dashboard go={go} />}
          {view === "material" && <Material id={ctx.id} go={go} />}
          {view === "quiz" && <Quiz {...ctx} go={go} />}
          {view === "cards" && <Flashcards cards={ctx.cards} go={go} id={ctx.id} />}
          {view === "profile" && <Profile session={session} go={go} />}
          {view === "pro" && <Pro />}
        </main>
      </div>
    );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" className="fixed bottom-4 right-4 z-10 rounded-full bg-slate-200 p-3 dark:bg-slate-700">{dark ? "☀️" : "🌙"}</button>
      {app}
    </div>
  );
}

function Landing({ go, session }) {
  const features = [["📝", "Smart Notes", "Short, simple notes from any chapter."], ["❓", "MCQs & Mock Tests", "Practice with instant scoring."], ["🃏", "Flashcards", "Flip and memorise key ideas."], ["🎯", "Weak-topic tracking", "Know exactly what to revise."]];
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <p className="font-semibold text-indigo-600">📚 AI StudyMate</p>
      <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold md:text-5xl">Turn Your Notes Into Your Personal AI Tutor</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">Upload a PDF or paste your notes and get exam-ready notes, quizzes and flashcards in seconds.</p>
      <Btn className="mt-8 px-8 py-3 text-lg" onClick={() => go(session ? "dashboard" : "auth")}>Start Studying</Btn>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([i, t, d]) => <Card key={t}><div className="text-3xl">{i}</div><h3 className="mt-2 font-semibold">{t}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{d}</p></Card>)}
      </div>
    </div>
  );
}

function Auth({ go }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [signup, setSignup] = useState(false), [err, setErr] = useState(""), [info, setInfo] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setInfo("");
    const { error } = signup ? await supabase.auth.signUp({ email, password: pw }) : await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message); else if (signup) setInfo("Check your email to confirm, then log in."); else go("dashboard");
  };
  const inp = "w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-600";
  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm space-y-3 p-4">
      <h2 className="text-2xl font-bold">{signup ? "Create account" : "Welcome back"}</h2>
      <input className={inp} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={inp} type="password" required minLength={6} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <Err msg={err} />{info && <p className="text-sm text-green-600">{info}</p>}
      <Btn className="w-full">{signup ? "Sign up" : "Log in"}</Btn>
      <button type="button" className="text-sm text-indigo-600" onClick={() => setSignup(!signup)}>{signup ? "Have an account? Log in" : "New here? Sign up"}</button>
    </form>
  );
}

function Dashboard({ go }) {
  const [docs, setDocs] = useState([]), [att, setAtt] = useState([]), [text, setText] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { api("/api/documents").then(setDocs).catch((e) => setErr(e.message)); api("/api/attempts").then(setAtt).catch(() => {}); }, []);
  const add = async (path, opts) => {
    setBusy(true); setErr("");
    try { const d = await api(path, opts); go("material", { id: d.id }); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const upload = (e) => { const f = e.target.files[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); add("/api/documents/upload", { method: "POST", body: fd }); };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Err msg={err} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h3 className="font-semibold">Upload a PDF</h3>
          <label className="mt-3 inline-block cursor-pointer rounded-full bg-indigo-600 px-5 py-2 text-white">{busy ? "Working…" : "Upload PDF"}<input type="file" accept="application/pdf" hidden disabled={busy} onChange={upload} /></label></Card>
        <Card><h3 className="font-semibold">Or paste text</h3>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-600" placeholder="Paste your notes…" />
          <Btn disabled={busy || text.length < 50} onClick={() => add("/api/documents/text", { method: "POST", json: { text } })}>Use text</Btn></Card>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-3xl font-bold">{att.length}</p><p className="text-sm text-slate-500">Quizzes completed</p></Card>
        <Card><p className="text-sm text-slate-500">Recent scores</p><p className="font-semibold">{att.slice(0, 3).map((a) => `${a.score}/${a.total}`).join(" · ") || "—"}</p></Card>
      </div>
      <Card><h3 className="mb-2 font-semibold">Recent study materials</h3>
        {docs.length === 0 && <p className="text-sm text-slate-500">Nothing yet — upload your first PDF!</p>}
        {docs.slice(0, 6).map((d) => <button key={d.id} onClick={() => go("material", { id: d.id })} className="block w-full border-b border-slate-100 py-2 text-left last:border-0 dark:border-slate-700">📄 {d.name}</button>)}</Card>
    </div>
  );
}

const KINDS = [["notes", "Generate Notes"], ["topics", "Important Topics"], ["mcqs", "Generate MCQs"], ["short", "Short Questions"], ["long", "Long Questions"], ["flashcards", "Flashcards"], ["mock", "Mock Test"]];

function Material({ id, go }) {
  const [doc, setDoc] = useState(null), [loading, setLoading] = useState(""), [err, setErr] = useState(""), [open, setOpen] = useState(null);
  useEffect(() => { api(`/api/documents/${id}`).then(setDoc).catch((e) => setErr(e.message)); }, [id]);
  const run = async (kind) => {
    setLoading(kind); setErr("");
    try {
      const r = await api(`/api/documents/${id}/generate/${kind}`, { method: "POST" });
      setDoc((d) => ({ ...d, generated: { ...d.generated, [kind]: r } }));
      if (kind === "mcqs" || kind === "mock") go("quiz", { id, questions: r.questions, title: kind === "mock" ? "Mock Test" : "MCQ Quiz" });
      else if (kind === "flashcards") go("cards", { id, cards: r.cards });
      else setOpen(kind);
    } catch (e) { setErr(e.status === 402 ? `🌟 ${e.message}` : e.message); } finally { setLoading(""); }
  };
  const view = (kind) => { const g = doc.generated[kind]; if (kind === "mcqs" || kind === "mock") go("quiz", { id, questions: g.questions, title: kind }); else if (kind === "flashcards") go("cards", { id, cards: g.cards }); else setOpen(kind); };
  if (!doc) return err ? <Err msg={err} /> : <p>Loading…</p>;
  const g = doc.generated[open];
  return (
    <div className="space-y-4">
      <button onClick={() => go("dashboard")} className="text-sm text-indigo-600">← Back</button>
      <h1 className="text-2xl font-bold">📄 {doc.name}</h1>
      <Err msg={err} />
      <div className="flex flex-wrap gap-2">
        {KINDS.map(([k, l]) => <Btn key={k} disabled={!!loading} onClick={() => run(k)}>{loading === k ? "Generating…" : l}</Btn>)}
      </div>
      <p className="text-sm text-slate-500">Already generated (tap to view): {Object.keys(doc.generated).map((k) => <button key={k} onClick={() => view(k)} className="mr-2 underline">{k}</button>)}</p>
      {loading && <p aria-live="polite" className="animate-pulse">AI is reading your material… this can take a little while.</p>}
      {g && <Card className="whitespace-pre-wrap">
        {open === "notes" && g.notes}
        {open === "topics" && g.topics.map((t, i) => <p key={i} className="mb-2"><b>{t.topic}</b> — {t.why}</p>)}
        {(open === "short" || open === "long") && g.questions.map((q, i) => <div key={i} className="mb-4"><b>Q{i + 1}. {q.question}</b><p>{q.answer}</p></div>)}
      </Card>}
    </div>
  );
}

function Quiz({ id, questions, title, go }) {
  const [i, setI] = useState(0), [ans, setAns] = useState({}), [done, setDone] = useState(null);
  const q = questions[i];
  const submit = async () => {
    const wrong = questions.filter((x, n) => ans[n] !== x.answer);
    const weak = [...new Set(wrong.map((x) => x.topic).filter(Boolean))];
    const score = questions.length - wrong.length;
    setDone({ score, weak });
    api("/api/attempts", { method: "POST", json: { doc_id: id, score, total: questions.length, weak_topics: weak } }).catch(() => {});
  };
  if (done) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Score: {done.score}/{questions.length}</h1>
      <Card><b>Weak topics:</b> {done.weak.length ? done.weak.join(", ") : "None — great job! 🎉"}</Card>
      {questions.map((x, n) => <Card key={n}><p className="font-medium">{n + 1}. {x.question}</p>
        <p className={ans[n] === x.answer ? "text-green-600" : "text-red-600"}>{ans[n] === x.answer ? "✓ Correct" : `✗ Your answer: ${x.options[ans[n]] ?? "skipped"}`}</p>
        <p>Correct: {x.options[x.answer]}</p><p className="text-sm text-slate-500">{x.explanation}</p></Card>)}
      <Btn onClick={() => go("material", { id })}>Back to material</Btn>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm">{title} · Question {i + 1} of {questions.length}</p>
      <div className="h-2 rounded bg-slate-200 dark:bg-slate-700"><div className="h-2 rounded bg-indigo-600" style={{ width: `${((i + 1) / questions.length) * 100}%` }} /></div>
      <Card><h2 className="mb-4 text-lg font-semibold">{q.question}</h2>
        <div role="radiogroup" className="space-y-2">{q.options.map((o, n) =>
          <button key={n} role="radio" aria-checked={ans[i] === n} onClick={() => setAns({ ...ans, [i]: n })} className={`block w-full rounded-xl border p-3 text-left ${ans[i] === n ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950" : "border-slate-300 dark:border-slate-600"}`}>{o}</button>)}</div></Card>
      <div className="flex justify-between">
        <Btn disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Btn>
        {i < questions.length - 1 ? <Btn onClick={() => setI(i + 1)}>Next</Btn> : <Btn onClick={submit}>Submit</Btn>}
      </div>
    </div>
  );
}

function Flashcards({ cards, go, id }) {
  const [i, setI] = useState(0), [flip, setFlip] = useState(false);
  const move = (d) => { setFlip(false); setI(i + d); };
  return (
    <div className="space-y-4 text-center">
      <button onClick={() => go("material", { id })} className="text-sm text-indigo-600">← Back</button>
      <p className="text-sm">Card {i + 1} of {cards.length}</p>
      <button onClick={() => setFlip(!flip)} aria-label="Flip card" className={`flip ${flip ? "on" : ""} mx-auto block h-64 w-full max-w-md`}>
        <div className="relative h-full w-full">
          <div className="face absolute inset-0 flex items-center justify-center rounded-2xl bg-indigo-600 p-6 text-xl text-white">{cards[i].front}</div>
          <div className="face back absolute inset-0 flex items-center justify-center rounded-2xl bg-white p-6 text-lg text-slate-900 shadow dark:bg-slate-700 dark:text-white">{cards[i].back}</div>
        </div>
      </button>
      <div className="flex justify-center gap-3"><Btn disabled={i === 0} onClick={() => move(-1)}>Previous</Btn><Btn disabled={i === cards.length - 1} onClick={() => move(1)}>Next</Btn></div>
    </div>
  );
}

function Profile({ session, go }) {
  const [docs, setDocs] = useState([]), [att, setAtt] = useState([]);
  useEffect(() => { api("/api/documents").then(setDocs).catch(() => {}); api("/api/attempts").then(setAtt).catch(() => {}); }, []);
  const chart = [...att].reverse().map((a, n) => ({ n: n + 1, pct: Math.round((a.score / a.total) * 100) }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card><p>{session.user.email}</p><p className="text-sm text-slate-500">Plan: Free · {docs.length} documents · {att.length} quizzes</p></Card>
      <Card><h3 className="mb-2 font-semibold">Quiz scores (%)</h3>
        {chart.length ? <div className="h-48"><ResponsiveContainer><BarChart data={chart}><XAxis dataKey="n" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="pct" fill="#4f46e5" radius={6} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500">No quizzes yet.</p>}</Card>
      <Card><h3 className="mb-2 font-semibold">Documents</h3>{docs.map((d) => <button key={d.id} onClick={() => go("material", { id: d.id })} className="block py-1 underline">{d.name}</button>)}</Card>
    </div>
  );
}

// Placeholder only - no real payments yet.
const Pro = () => <Card className="text-center"><h1 className="text-2xl font-bold">🌟 StudyMate Pro</h1><p className="mt-2">Unlimited documents and quizzes — coming soon.</p><Btn disabled className="mt-4">Coming soon</Btn></Card>;
