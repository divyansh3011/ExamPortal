"""
Academic Sanctuary — FastAPI Backend
=====================================
Tech Stack: Python 3.11+, FastAPI, Firebase Admin SDK

Setup:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

Environment Variables (.env):
  FIREBASE_CREDENTIALS=path/to/serviceAccountKey.json
  SENDGRID_API_KEY=SG.xxxxx
  HOD_EMAIL=hod@university.edu
  SECRET_KEY=your-jwt-secret-key
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import os, json, base64, hashlib, time, random, string
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Academic Sanctuary API",
    description="Backend for the AI-powered examination portal",
    version="1.0.0"
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production: restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── FIREBASE INIT ───────────────────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth as fb_auth, storage as fb_storage
    
    cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv("FIREBASE_BUCKET", "your-project.appspot.com")
        })
        db = firestore.client()
        FIREBASE_ENABLED = True
        print("[Firebase] Connected successfully")
    else:
        FIREBASE_ENABLED = False
        print("[Firebase] WARN: serviceAccountKey.json not found. Using mock mode.")
        db = None
except ImportError:
    FIREBASE_ENABLED = False
    db = None
    print("[Firebase] firebase-admin not installed. Using mock mode.")

# ─── SENDGRID ────────────────────────────────────────────────
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
    SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_ENABLED = bool(SENDGRID_KEY)
except ImportError:
    SENDGRID_ENABLED = False
    print("[SendGrid] sendgrid not installed. Email will be mocked.")

# ─── IN-MEMORY MOCK STORE (when Firebase not configured) ─────
MOCK_STORE = {
    "exams":       {},
    "questions":   {},
    "results":     {},
    "incidents":   {},
    "snapshots":   {},
    "users":       {},
    "sessions":    {},
    "streaks":     {}
}


# ─── MODELS ──────────────────────────────────────────────────

class LoginRequest(BaseModel):
    identifier: str   # Roll No or Email
    password:   str
    role:       str = "student"   # student | admin

class ExamCreate(BaseModel):
    title:        str
    duration:     int
    instructions: Optional[str] = ""
    startAt:      Optional[str] = None
    endAt:        Optional[str] = None
    hodEmail:     Optional[str] = None
    randomQ:      bool = True
    proctoring:   Dict[str, bool] = {}

class QuestionCreate(BaseModel):
    examId:       str
    type:         str   # mcq | coding
    title:        str
    description:  Optional[str] = ""
    options:      Optional[List[str]] = []
    correct:      Optional[int] = 0
    points:       int = 10
    starterCode:  Optional[str] = ""
    testCases:    Optional[List[Dict]] = []
    topic:        Optional[str] = ""

class QuestionBulkImport(BaseModel):
    examId:    str
    questions: List[Dict[str, Any]]

class ResultSubmit(BaseModel):
    studentId:  str
    examId:     str
    examTitle:  str
    answers:    Dict[str, Any]
    score:      int
    total:      int
    incidents:  List[Dict] = []
    snapshots:  int = 0

class IncidentLog(BaseModel):
    studentId:  str
    examId:     str
    type:       str   # tab_switch | gaze_away | ip_change | copy_paste | face_mismatch
    severity:   str = "medium"
    details:    Dict[str, Any] = {}

class SnapshotUpload(BaseModel):
    studentId:  str
    examId:     str
    imageData:  str   # base64 encoded JPEG

class HODEmailRequest(BaseModel):
    studentName: str
    studentId:   str
    examTitle:   str
    score:       int
    total:       int
    hodEmail:    EmailStr
    incidents:   List[str] = []


# ─── HELPERS ─────────────────────────────────────────────────

def mock_id():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))

def get_from_db(collection: str, doc_id: str = None):
    if FIREBASE_ENABLED and db:
        if doc_id:
            doc = db.collection(collection).document(doc_id).get()
            return doc.to_dict() if doc.exists else None
        else:
            return [d.to_dict() | {"id": d.id} for d in db.collection(collection).stream()]
    else:
        if doc_id:
            return MOCK_STORE.get(collection, {}).get(doc_id)
        return list(MOCK_STORE.get(collection, {}).values())

def save_to_db(collection: str, data: dict, doc_id: str = None):
    if FIREBASE_ENABLED and db:
        if doc_id:
            db.collection(collection).document(doc_id).set(data)
            return doc_id
        else:
            ref = db.collection(collection).add(data)
            return ref[1].id
    else:
        doc_id = doc_id or mock_id()
        if collection not in MOCK_STORE:
            MOCK_STORE[collection] = {}
        MOCK_STORE[collection][doc_id] = {**data, "id": doc_id}
        return doc_id


# ─── ROUTES: AUTH ─────────────────────────────────────────────

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """
    Authenticate student or admin.
    In production, validate Firebase ID token.
    """
    # Mock: accept any credentials
    user_data = {
        "id":       req.identifier,
        "role":     req.role,
        "name":     req.identifier.split("@")[0] if "@" in req.identifier else req.identifier,
        "rollNo":   req.identifier.upper(),
        "token":    "mock_token_" + mock_id()
    }
    save_to_db("users", user_data, doc_id=req.identifier)
    return {"success": True, "user": user_data}


@app.get("/api/auth/me")
async def get_me(authorization: str = Header(default="")):
    """Return current user based on token."""
    # In production: validate JWT / Firebase token
    return {"authenticated": True, "role": "student"}


# ─── ROUTES: EXAMS ────────────────────────────────────────────

@app.get("/api/exams")
async def get_exams(published: Optional[bool] = None):
    """Return all exams, optionally filtered by published status."""
    exams = get_from_db("exams")
    if published is not None:
        exams = [e for e in exams if e.get("published") == published]
    return {"exams": exams, "count": len(exams)}


@app.post("/api/exams")
async def create_exam(exam: ExamCreate):
    """Create a new exam."""
    data = exam.dict() | {
        "published":  False,
        "createdAt":  datetime.utcnow().isoformat(),
        "questionIds": []
    }
    exam_id = save_to_db("exams", data)
    return {"success": True, "examId": exam_id, "exam": data}


@app.put("/api/exams/{exam_id}/publish")
async def publish_exam(exam_id: str):
    """Publish an exam, making it available to students."""
    exam = get_from_db("exams", exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam["published"]   = True
    exam["publishedAt"] = datetime.utcnow().isoformat()
    save_to_db("exams", exam, doc_id=exam_id)
    return {"success": True, "examId": exam_id}


@app.delete("/api/exams/{exam_id}")
async def delete_exam(exam_id: str):
    if FIREBASE_ENABLED and db:
        db.collection("exams").document(exam_id).delete()
    elif exam_id in MOCK_STORE.get("exams", {}):
        del MOCK_STORE["exams"][exam_id]
    return {"success": True}


# ─── ROUTES: QUESTIONS ────────────────────────────────────────

@app.post("/api/questions")
async def add_question(q: QuestionCreate):
    """Add a single question to an exam."""
    data = q.dict() | {"createdAt": datetime.utcnow().isoformat()}
    q_id = save_to_db("questions", data)
    return {"success": True, "questionId": q_id}


@app.post("/api/questions/bulk-import")
async def bulk_import(body: QuestionBulkImport):
    """
    Bulk import questions for an exam.
    Accepts JSON array of question objects.
    Supports: mcq, coding question types.
    """
    ids = []
    for q in body.questions:
        data = {
            "examId":      body.examId,
            "type":        q.get("type",   "mcq"),
            "title":       q.get("title",  q.get("question", "")),
            "options":     q.get("options", []),
            "correct":     q.get("correct", q.get("answer", 0)),
            "points":      q.get("points",  10),
            "starterCode": q.get("starter_code", q.get("starterCode", "")),
            "testCases":   q.get("test_cases",   q.get("testCases", [])),
            "topic":       q.get("topic", ""),
            "createdAt":   datetime.utcnow().isoformat()
        }
        q_id = save_to_db("questions", data)
        ids.append(q_id)
    return {"success": True, "imported": len(ids), "questionIds": ids}


@app.get("/api/exams/{exam_id}/questions")
async def get_exam_questions(exam_id: str, random_order: bool = False):
    """Get all questions for an exam, optionally randomized."""
    all_qs = get_from_db("questions")
    exam_qs = [q for q in all_qs if q.get("examId") == exam_id]
    if random_order:
        random.shuffle(exam_qs)
    return {"questions": exam_qs, "count": len(exam_qs)}


# ─── ROUTES: RESULTS ─────────────────────────────────────────

@app.post("/api/results/submit")
async def submit_result(result: ResultSubmit):
    """
    Submit exam result.
    Saves to Firestore and triggers HOD email notification.
    """
    data = result.dict() | {
        "percentage":  round((result.score / result.total * 100), 2) if result.total else 0,
        "grade":       get_grade(result.score, result.total),
        "submittedAt": datetime.utcnow().isoformat()
    }
    result_id = save_to_db("results", data)

    # Update streak
    streak = update_streak_mock(result.studentId)

    return {
        "success":  True,
        "resultId": result_id,
        "grade":    data["grade"],
        "streak":   streak,
        "aiResume": generate_ai_resume(result)
    }


@app.get("/api/results/{student_id}")
async def get_student_results(student_id: str):
    """Get all results for a student."""
    all_results = get_from_db("results")
    student_results = [r for r in all_results if r.get("studentId") == student_id]
    student_results.sort(key=lambda r: r.get("submittedAt", ""), reverse=True)
    return {"results": student_results, "count": len(student_results)}


# ─── ROUTES: PROCTORING ───────────────────────────────────────

@app.post("/api/proctoring/incident")
async def log_incident(incident: IncidentLog):
    """Log a cheating/violation incident."""
    data = incident.dict() | {"timestamp": datetime.utcnow().isoformat()}
    inc_id = save_to_db("incidents", data)
    return {"success": True, "incidentId": inc_id}


@app.post("/api/proctoring/snapshot")
async def save_snapshot(snap: SnapshotUpload):
    """
    Save a webcam snapshot.
    In production: uploads to Firebase Storage.
    Returns the storage URL.
    """
    snap_data = {
        "studentId": snap.studentId,
        "examId":    snap.examId,
        "timestamp": datetime.utcnow().isoformat(),
        "size":      len(snap.imageData)
    }
    snap_id = save_to_db("snapshots", snap_data)

    url = f"https://storage.googleapis.com/snapshots/{snap.studentId}/{snap_id}.jpg"
    return {"success": True, "snapshotId": snap_id, "url": url}


@app.get("/api/proctoring/incidents/{exam_id}")
async def get_exam_incidents(exam_id: str, student_id: Optional[str] = None):
    """Get all incidents for an exam, optionally filtered by student."""
    all_incidents = get_from_db("incidents")
    incidents = [i for i in all_incidents if i.get("examId") == exam_id]
    if student_id:
        incidents = [i for i in incidents if i.get("studentId") == student_id]
    return {"incidents": incidents, "count": len(incidents)}


# ─── ROUTES: EMAIL ────────────────────────────────────────────

@app.post("/api/email/hod")
async def email_hod(req: HODEmailRequest):
    """
    Send exam result email to Head of Department.
    Uses SendGrid in production, mocks if not configured.
    """
    subject = f"[Academic Sanctuary] Exam Result: {req.studentName} — {req.examTitle}"
    pct     = round((req.score / req.total) * 100) if req.total else 0
    grade   = get_grade(req.score, req.total)
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #1E2A5E; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">📊 Examination Result Report</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Academic Sanctuary — Automated Notification</p>
      </div>
      <div style="background: #F4F3EF; padding: 24px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1E2A5E; margin-top: 0;">{req.examTitle}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666;">Student Name:</td><td style="font-weight: bold;">{req.studentName}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Student ID:</td><td>{req.studentId}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Score:</td><td style="font-weight: bold; color: {'#10B981' if pct >= 60 else '#EF4444'};">{req.score}/{req.total} ({pct}%) — Grade {grade}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Date:</td><td>{datetime.utcnow().strftime('%B %d, %Y')}</td></tr>
        </table>
        {f'<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin-top: 16px; border-radius: 0 8px 8px 0;"><strong>⚠️ Incidents:</strong><ul>' + ''.join(f'<li>{i}</li>' for i in req.incidents) + '</ul></div>' if req.incidents else ''}
        <p style="color: #8B8FA8; font-size: 12px; margin-top: 24px;">This is an automated message from Academic Sanctuary. Please do not reply to this email.</p>
      </div>
    </div>"""

    if SENDGRID_ENABLED:
        try:
            sg  = SendGridAPIClient(SENDGRID_KEY)
            msg = Mail(
                from_email="noreply@academicsanctuary.com",
                to_emails=req.hodEmail,
                subject=subject,
                html_content=html_body
            )
            sg.send(msg)
            return {"success": True, "sent": True, "to": req.hodEmail}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        print(f"[EMAIL MOCK] To: {req.hodEmail}\nSubject: {subject}\n")
        return {"success": True, "sent": False, "mock": True, "message": "Email logged (SendGrid not configured)"}


# ─── ROUTES: IP CHECK ─────────────────────────────────────────

@app.get("/api/ip-check")
async def ip_check(request_ip: str = "0.0.0.0"):
    """Return the client's IP address for change detection."""
    return {"ip": request_ip, "timestamp": datetime.utcnow().isoformat()}


# ─── ROUTES: ANALYTICS ───────────────────────────────────────

@app.get("/api/analytics/{student_id}")
async def get_analytics(student_id: str):
    """Return performance analytics for a student."""
    results = get_from_db("results")
    student_results = [r for r in results if r.get("studentId") == student_id]
    
    if not student_results:
        return {
            "studentId":   student_id,
            "totalExams":  0,
            "avgScore":    0,
            "topicScores": {},
            "streak":      0
        }

    avg_score = sum(r.get("percentage", 0) for r in student_results) / len(student_results)
    streak = MOCK_STORE.get("streaks", {}).get(student_id, {}).get("streak", 0)

    return {
        "studentId":   student_id,
        "totalExams":  len(student_results),
        "avgScore":    round(avg_score, 2),
        "recentResults": student_results[:5],
        "streak":      streak
    }


@app.get("/api/analytics/institution/overview")
async def institution_overview():
    """Return institution-wide analytics for admin dashboard."""
    all_results = get_from_db("results")
    all_incidents = get_from_db("incidents")
    return {
        "totalExams":     len(get_from_db("exams")),
        "totalStudents":  len(get_from_db("users")),
        "totalResults":   len(all_results),
        "avgScore":       round(sum(r.get("percentage", 0) for r in all_results) / max(len(all_results), 1), 2),
        "totalIncidents": len(all_incidents),
        "incidentTypes":  count_incident_types(all_incidents)
    }


# ─── HELPER FUNCTIONS ─────────────────────────────────────────

def get_grade(score: int, total: int) -> str:
    if total == 0: return "N/A"
    pct = (score / total) * 100
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B"
    if pct >= 60: return "C"
    if pct >= 50: return "D"
    return "F"

def update_streak_mock(student_id: str) -> int:
    today     = datetime.utcnow().date().isoformat()
    streak_data = MOCK_STORE.get("streaks", {}).get(student_id, {})
    last_date   = streak_data.get("lastDate", "")
    streak      = streak_data.get("streak", 0)
    yesterday   = (datetime.utcnow().date() - timedelta(days=1)).isoformat()

    if last_date == today:
        return streak
    streak = streak + 1 if last_date == yesterday else 1
    if "streaks" not in MOCK_STORE:
        MOCK_STORE["streaks"] = {}
    MOCK_STORE["streaks"][student_id] = {"streak": streak, "lastDate": today}
    return streak

def count_incident_types(incidents: list) -> dict:
    counts = {}
    for inc in incidents:
        t = inc.get("type", "unknown")
        counts[t] = counts.get(t, 0) + 1
    return counts

def generate_ai_resume(result) -> dict:
    """Generate an AI-based skill resume summary from exam results."""
    pct = round((result.score / result.total) * 100) if result.total else 0
    skills = []
    
    # Infer skills from exam title keywords
    title = result.examTitle.lower()
    if any(k in title for k in ['algorithm', 'data structure']): skills.append({"name": "Algorithm Design", "level": "Proficient" if pct >= 70 else "Intermediate"})
    if any(k in title for k in ['network', 'systems']):          skills.append({"name": "Computer Networks", "level": "Proficient" if pct >= 70 else "Intermediate"})
    if any(k in title for k in ['machine learning', 'ml', 'ai']): skills.append({"name": "Machine Learning", "level": "Expert" if pct >= 90 else "Proficient"})
    if any(k in title for k in ['database', 'sql']):             skills.append({"name": "Database Management", "level": "Proficient"})
    if any(k in title for k in ['neural', 'deep', 'architecture']): skills.append({"name": "Neural Networks", "level": "Expert" if pct >= 85 else "Proficient"})
    if not skills:
        skills.append({"name": "Software Engineering", "level": "Intermediate"})

    grade = get_grade(result.score, result.total)
    summary = (
        f"Demonstrated {grade}-grade proficiency in {result.examTitle}, achieving {pct}% accuracy. "
        f"Strong analytical and problem-solving skills with competencies in {', '.join(s['name'] for s in skills[:2])}. "
        f"Recommended for {'senior' if pct >= 85 else 'mid-level'} software engineering roles."
    )
    return {"skills": skills, "summary": summary, "grade": grade, "score": pct}


# ─── HEALTH CHECK ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service":  "Academic Sanctuary API",
        "version":  "1.0.0",
        "status":   "operational",
        "firebase": FIREBASE_ENABLED,
        "email":    SENDGRID_ENABLED,
        "docs":     "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
