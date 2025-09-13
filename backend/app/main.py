# app/main.py
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request, APIRouter, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Query, Body
load_dotenv()

from .auth import get_current_user
from .database import get_db, engine, Base
from . import session_manager
from fastapi.responses import JSONResponse
from typing import Optional
from .auth import get_current_user, get_user_from_token

# Ensure DB tables exist (SQLAlchemy models import Base from database)
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

app = FastAPI(title="N-device Demo Backend")
router = APIRouter()

# allow localhost:3000 during development (update env for prod)
origins = [os.getenv("FRONTEND_ORIGIN", "https://lawandverdict.vercel.app")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"msg": "Backend up!", "env": {"frontend_origin": origins[0]}}


@app.get("/private")
def private(request: Request, user: dict = Depends(get_current_user)):
    """
    Simple test endpoint: returns the authenticated user's name and the provided X-Session-ID.
    Use this to verify JWT + session header behavior quickly.
    """
    session_id = request.headers.get("X-Session-ID")
    return {
        "sub": user.get("sub"),
        "name": user.get("name"),
        "phone_number": user.get("phone_number"),
        "session_id": session_id
    }

@app.post("/debug/verify-token")
def debug_verify_token(token: Optional[str] = Body(None)):
    """
    DEV-ONLY: Post a token in JSON body {"token":"..."} to debug verification.
    Returns decoded payload on success, or error details.
    """
    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "detail": "Please provide token in body"})
    try:
        payload = None
        # import here to avoid circular import issues
        from .auth import verify_jwt
        result = verify_jwt(token)
        payload = result.get("_raw_payload") if isinstance(result, dict) else result
        return {"ok": True, "payload": payload}
    except HTTPException as e:
        # return the HTTPException detail so you can see exact error
        return JSONResponse(status_code=e.status_code, content={"ok": False, "detail": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "detail": str(e)})


@app.post("/sessions/register")
def register(request: Request, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Register a new session. Client must send Authorization: Bearer <access_token>.
    Also include header X-Device-Name for UI friendly device name (optional).
    """
    if not user or "sub" not in user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    device_meta = {
        "device_name": request.headers.get("X-Device-Name", "Browser"),
        "user_agent": request.headers.get("User-Agent", "unknown"),
    }
    max_devices = int(os.getenv("N_MAX_DEVICES", "3"))
    result = session_manager.register_session(db, user["sub"], device_meta, max_devices)
    logger.info("Registered session for %s => %s", user["sub"], result)
    return result


@app.get("/sessions/list")
def sessions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user or "sub" not in user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    sessions_list = session_manager.list_sessions(db, user["sub"])
    return sessions_list


@app.post("/sessions/logout")
def logout(session_id: str = Body(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user or "sub" not in user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    ok = session_manager.logout_session(db, user["sub"], session_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Session not found")
    logger.info("User %s logged out session %s", user["sub"], session_id)
    return {"status": "logged_out", "session_id": session_id}

@app.post("/sessions/cancel")
def cancel(
    session_id: str | None = Body(None),
    session_id_q: str | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_user_from_token),
):
    # prefer body then query
    sid = session_id or session_id_q
    if not sid:
        raise HTTPException(status_code=422, detail="Missing session_id in body or query")

    ok = session_manager.cancel_session(db, user["sub"], sid)
    if not ok:
        raise HTTPException(status_code=400, detail="Unable to cancel session (not found or not pending)")
    return {"status": "cancelled", "session_id": sid}

# FORCE ACTIVATE endpoint
@app.post("/sessions/force_activate")
def force_activate(candidate_id: str = Body(...), target_id: str = Body(...),
                   db: Session = Depends(get_db), user=Depends(get_user_from_token)):
    if not user or "sub" not in user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        session_manager.force_activate(db, user["sub"], candidate_id, target_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "activated", "session_id": candidate_id, "revoked": target_id}

@app.get("/user/me")
def read_users_me(user: dict = Depends(get_current_user)):
    return {
        "sub": user.get("sub"),
        "name": user.get("name"),
        "phone_number": user.get("phone_number"),
    }


app.include_router(router, prefix="", tags=["users"])
