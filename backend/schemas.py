from pydantic import BaseModel
import datetime

class TextIn(BaseModel):
    text: str

class CaseBase(BaseModel):
    case_no: str
    category: str
    source: str | None = None

class CaseCreate(CaseBase):
    pass

class Case(CaseBase):
    id: int
    create_date: datetime.datetime
    status: str

    class Config:
        orm_mode = True
