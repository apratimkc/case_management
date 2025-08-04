from sqlalchemy.orm import Session
import models
import schemas

def get_cases(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Case).offset(skip).limit(limit).all()

def create_case(db: Session, case: schemas.CaseCreate):
    db_case = models.Case(case_no=case.case_no, category=case.category, source=case.source)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

def mark_case_as_complete(db: Session, case_id: int):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if db_case:
        db_case.status = "complete"
        db.commit()
        db.refresh(db_case)
    return db_case
