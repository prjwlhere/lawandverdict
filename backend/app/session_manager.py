# app/session_manager.py
import uuid, time
from sqlalchemy.orm import Session
from .models import Session as SessionModel

def register_session(db: Session, user_id: str, device_meta: dict, max_devices: int = 3):
    """
    Create a session row. If adding this session pushes active sessions over max_devices,
    keep new session as 'pending' and return overquota information.
    """
    session_id = str(uuid.uuid4())
    now = int(time.time())
    s = SessionModel(
        id=session_id,
        user_id=user_id,
        device_name=device_meta.get("device_name", "Browser"),
        user_agent=device_meta.get("user_agent", "unknown"),
        status="active",
        issued_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    # count active sessions
    active_count = db.query(SessionModel).filter(
        SessionModel.user_id == user_id,
        SessionModel.status == "active"
    ).count()

    # If over quota, mark this session as pending
    if active_count > max_devices:
        s.status = "pending"
        db.add(s)
        db.commit()
        # return sessions list for UI
        sessions = list_sessions(db, user_id)
        return {"overquota": True, "candidate": session_id, "sessions": sessions}

    sessions = list_sessions(db, user_id)
    return {"overquota": False, "session_id": session_id, "sessions": sessions}


def list_sessions(db: Session, user_id: str):
    rows = db.query(SessionModel).filter(SessionModel.user_id == user_id).order_by(SessionModel.issued_at.asc()).all()
    out = []
    for r in rows:
        out.append({
            "id": r.id,
            "user_id": r.user_id,
            "device_name": r.device_name,
            "user_agent": r.user_agent,
            "status": r.status,
            "issued_at": r.issued_at,
        })
    return out


def logout_session(db: Session, user_id: str, session_id: str):
    s = db.query(SessionModel).filter(SessionModel.id == session_id, SessionModel.user_id == user_id).first()
    if not s:
        return False
    s.status = "revoked"
    db.add(s)
    db.commit()
    return True


def cancel_session(db: Session, user_id: str, session_id: str):
    s = db.query(SessionModel).filter(SessionModel.id == session_id, SessionModel.user_id == user_id).first()
    if not s:
        return False
    if s.status != "pending":
        return False
    # delete pending candidate for simplicity
    db.delete(s)
    db.commit()
    return True


def force_activate(db: Session, user_id: str, candidate_id: str, target_id: str):
    """
    Revoke target_id and set candidate to active (transactional-ish).
    """
    candidate = db.query(SessionModel).filter(SessionModel.id == candidate_id, SessionModel.user_id == user_id).first()
    if not candidate or candidate.status != "pending":
        raise ValueError("Candidate session not found or not pending")

    target = db.query(SessionModel).filter(SessionModel.id == target_id, SessionModel.user_id == user_id).first()
    if not target or target.status != "active":
        raise ValueError("Target session not found or not active")

    # Revoke target and activate candidate
    target.status = "revoked"
    candidate.status = "active"
    db.add(target)
    db.add(candidate)
    db.commit()
    return True
