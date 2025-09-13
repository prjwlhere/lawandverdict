# app/auth.py
import os
import json
import time
import logging
from functools import lru_cache
from typing import Dict, Any, Optional

import httpx
import jwt
from jwt import ImmatureSignatureError
from jwt.algorithms import RSAAlgorithm
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .database import get_db

load_dotenv()

# -------------------------
# Logger
# -------------------------
logger = logging.getLogger("auth")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    ch.setFormatter(fmt)
    logger.addHandler(ch)

# -------------------------
# Config (from env, with sensible defaults for local dev)
# -------------------------
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "dev-8whvepj1827d3ilh.us.auth0.com")
API_AUDIENCE = os.getenv("API_AUDIENCE", "https://fastapi-backend")
ALGORITHMS = os.getenv("AUTH0_ALGORITHMS", "RS256").split(",")
CUSTOM_NAMESPACE = os.getenv("CUSTOM_NAMESPACE", "https://lawandverdict.app/")
JWT_LEEWAY = int(os.getenv("JWT_LEEWAY", "60"))  # seconds of leeway for iat/exp

security = HTTPBearer()


# -------------------------
# JWKS fetching (cached)
# -------------------------
@lru_cache()
def get_jwks() -> Dict[str, Any]:
    """
    Fetch the JWKS from Auth0. Cached with lru_cache.
    """
    if not AUTH0_DOMAIN:
        raise RuntimeError("AUTH0_DOMAIN not set in environment")
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    logger.debug("Fetching JWKS from %s", url)
    resp = httpx.get(url, timeout=5.0)
    resp.raise_for_status()
    jwks = resp.json()
    logger.debug("Fetched %d keys from JWKS", len(jwks.get("keys", [])))
    return jwks


# -------------------------
# Helpers
# -------------------------
def _canonicalize_token(raw: Optional[str]) -> Optional[str]:
    """
    Clean up token string: strip whitespace, surrounding quotes and optional "Bearer " prefix.
    """
    if not raw:
        return None
    t = raw.strip()
    # remove surrounding quotes if present
    if (t.startswith('"') and t.endswith('"')) or (t.startswith("'") and t.endswith("'")):
        t = t[1:-1].strip()
    # remove bearer prefix
    if t.lower().startswith("bearer "):
        t = t.split(" ", 1)[1].strip()
    return t


# -------------------------
# Core verifier
# -------------------------
def verify_jwt(token: str) -> Dict[str, Any]:
    """
    Verify an Auth0-issued access token (JWT).

    Returns a dict with 'sub', optional name/phone, and '_raw_payload'.
    Raises HTTPException(401) on verification failure with a helpful message.
    """
    logger.debug("verify_jwt called")

    token = _canonicalize_token(token)
    if token is None or not isinstance(token, str) or len(token.split(".")) != 3:
        logger.warning("Token is not JWT-like after canonicalization: %r", token)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")

    # read unverified header to get kid
    try:
        headers = jwt.get_unverified_header(token)
    except Exception as e:
        logger.exception("Failed to get unverified header from token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Malformed token header: {e}")

    kid = headers.get("kid")
    logger.debug("Token header kid: %s", kid)
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing 'kid' header")

    # find matching JWK
    jwks = get_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        # retry once after clearing cache
        logger.debug("Kid not found, clearing JWKS cache and retry")
        get_jwks.cache_clear()
        jwks = get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            logger.error("Public key for kid not found in JWKS")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Public key not found for token kid")

    logger.debug("Found JWK for kid, building public key")
    try:
        public_key = RSAAlgorithm.from_jwk(json.dumps(key))
    except Exception as e:
        logger.exception("Failed to build public key from JWK")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid JWK format: {e}")

    # decode token while skipping audience verification (we will check aud manually)
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=ALGORITHMS,
            options={"verify_aud": False},
            issuer=f"https://{AUTH0_DOMAIN}/",
            leeway=JWT_LEEWAY,
        )
    except ImmatureSignatureError:
        # token iat is in future — show details and hint about clock skew
        try:
            unverified = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            iat = unverified.get("iat")
        except Exception:
            iat = None
        now = int(time.time())
        logger.warning("Token not yet valid (iat=%s now=%s leeway=%s)", iat, now, JWT_LEEWAY)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token not yet valid (iat={iat}). Server time now={now}. Consider increasing JWT_LEEWAY or syncing server clock."
        )
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidIssuerError as e:
        logger.warning("Invalid issuer: %s", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token issuer: {e}")
    except jwt.InvalidSignatureError as e:
        logger.warning("Invalid signature: %s", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token signature: {e}")
    except Exception as e:
        logger.exception("JWT decode error")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"JWT decode error: {e}")

    logger.debug("Decoded JWT payload keys: %s", list(payload.keys()))

    # manual audience validation (aud may be str or list)
    aud = payload.get("aud")
    if isinstance(aud, str):
        aud = [aud]
    logger.debug("Token aud claim: %s (expected %s)", aud, API_AUDIENCE)
    if not aud or API_AUDIENCE not in aud:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid audience in token (expected '{API_AUDIENCE}'). token aud={payload.get('aud')}"
        )

    # normalized user object
    user = {
        "sub": payload.get("sub"),
        "name": payload.get(f"{CUSTOM_NAMESPACE}name") or payload.get("name"),
        "phone_number": payload.get(f"{CUSTOM_NAMESPACE}phone_number") or payload.get("phone_number"),
        "_raw_payload": payload,
    }
    logger.debug("verify_jwt success for sub=%s", user["sub"])
    return user


# convenience: decode token for debug endpoints (calls verify_jwt)
def decode_token_for_debug(token: str) -> Dict[str, Any]:
    verified = verify_jwt(token)
    return verified.get("_raw_payload", {})


# -------------------------
# FastAPI dependency
# -------------------------
def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    FastAPI dependency that:
      - verifies JWT using verify_jwt()
      - requires X-Session-ID header for protected endpoints (except /sessions/register)
      - verifies session exists, belongs to the token sub, and is active
    """
    # extract token
    if not credentials:
        logger.warning("Missing Authorization credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization credentials")
    token = credentials.credentials

    # verify token
    user = verify_jwt(token)

    # allow /sessions/register without X-Session-ID (this call creates the session)
    path = request.url.path
    if path != "/sessions/register":
        session_id = request.headers.get("X-Session-ID")
        if not session_id:
            logger.warning("Missing X-Session-ID header for protected endpoint %s", path)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Session-ID header")

        # check DB session
        from .models import Session as SessionModel
        s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not s:
            logger.warning("Session not found: %s", session_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        if s.user_id != user.get("sub"):
            logger.warning("Session %s does not belong to token subject %s (session.user_id=%s)", session_id, user.get("sub"), s.user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session does not belong to the token subject")
        if s.status == "revoked":
            logger.info("Session %s revoked", session_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")
        if s.status == "pending":
            logger.info("Session %s pending", session_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session pending activation")

    return user


# expose for easy imports
__all__ = ["verify_jwt", "decode_token_for_debug", "get_current_user", "get_jwks"]
