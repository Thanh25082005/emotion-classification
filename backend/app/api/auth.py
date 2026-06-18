"""
REST auth (muc 6.1):
  POST /api/auth/register -> 201 {id, username} | 409 neu trung
  POST /api/auth/login    -> 200 {access_token, token_type} | 401
  GET  /api/auth/me       -> 200 {id, username} | 401
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: lay user tu JWT trong header Authorization: Bearer."""
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thieu token")
    username = decode_token(creds.credentials)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token khong hop le")
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User khong ton tai")
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.username == body.username))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username da ton tai")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(id=user.id, username=user.username)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai username hoac mat khau"
        )
    token = create_access_token(subject=user.username)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)):
    return UserResponse(id=current.id, username=current.username)
