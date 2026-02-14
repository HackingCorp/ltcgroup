from pydantic import BaseModel, UUID4


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: UUID4
    email: str
