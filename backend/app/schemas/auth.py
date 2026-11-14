import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_\.]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=128)
    department: Optional[str] = Field("Emergency Department", max_length=64)


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserApprovalRequest(BaseModel):
    role: str = Field(..., pattern=r"^(ADMIN|NURSE|FRONT_DESK)$")
    department: Optional[str] = Field(None, max_length=64)


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    status: str
    department: str
    created_at: datetime.datetime
    approved_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None
    csrf_token: Optional[str] = None
    message: Optional[str] = None


class CSRFTokenResponse(BaseModel):
    csrf_token: str
