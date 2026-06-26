from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    name: str
    password: str
    role: str = "vendedor"
    signo: str | None = None
    comissao_percentual: float = 0.0


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    active: bool | None = None
    signo: str | None = None
    comissao_percentual: float | None = None
    password: str | None = None  # optional new password


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    active: bool
    signo: str | None = None
    comissao_percentual: float = 0.0

    class Config:
        from_attributes = True
