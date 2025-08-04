import logging
import json
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from PIL import Image
import io
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from decouple import config
import google.generativeai as genai

import crud
import models
import schemas
from database import SessionLocal, engine

# --- Configuration and Setup ---

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__) 

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Configure Google AI
try:
    genai.configure(api_key=config('GOOGLE_API_KEY'))
except Exception as e:
    logger.error(f"Failed to configure Google AI: {e}")

app = FastAPI()

# --- Middleware ---

# CORS (Cross-Origin Resource Sharing)
# Allow all origins for debugging purposes
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependencies ---

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints ---

@app.post("/api/cases/", response_model=schemas.Case)
def create_case(case: schemas.CaseCreate, db: Session = Depends(get_db)):
    return crud.create_case(db=db, case=case)

@app.get("/api/cases/", response_model=list[schemas.Case])
def read_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = crud.get_cases(db, skip=skip, limit=limit)
    return cases

@app.post("/api/extract-case-no/")
def extract_case_no(text_in: schemas.TextIn):
    logger.info(f"Received text for extraction: {text_in.text[:100]}...")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt_template = '''You are an expert data extraction assistant. Your task is to find all 7-digit case numbers and their corresponding source names from the following text.

The text contains a list of cases. Each line may have a case number and a source name.
- The case number is always exactly 7 digits long.
- The source is a name of a person, which can be found next to the case number. If no source is present, the value for source should be null.
- Sometimes there is a dot (.) after the source name, which you should ignore.
- Sometimes there are index numbers at the beginning of the line, which you should also ignore.

Your response must be a JSON object with a single key "cases" which is a list of objects. Each object in the list should have two keys: "case_no" and "source".

Example input:
1. 1234567 John Doe
2. 2345678 Jane Smith.
   - 3456789

Example output:
```json
{{
  "cases": [
    {{
      "case_no": "1234567",
      "source": "John Doe"
    }},
    {{
      "case_no": "2345678",
      "source": "Jane Smith"
    }},
    {{
      "case_no": "3456789",
      "source": null
    }}
  ]
}}
```

Text:
"{text}"'''
        
        prompt = prompt_template.format(text=text_in.text)
        
        response = model.generate_content(prompt)
        
        # Clean the response to extract only the JSON part
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        
        # Parse the JSON response
        extracted_data = json.loads(cleaned_response)
        
        logger.info(f"Successfully extracted case data: {extracted_data}")
        return extracted_data
    except Exception as e:
        logger.error(f"An error occurred during Google AI API call or JSON parsing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

@app.put("/api/cases/{case_id}/complete", response_model=schemas.Case)
def mark_case_complete(case_id: int, db: Session = Depends(get_db)):
    db_case = crud.mark_case_as_complete(db, case_id=case_id)
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return db_case

@app.post("/api/extract-case-no-from-image/")
async def extract_case_no_from_image(file: UploadFile = File(...)):
    logger.info(f"Received image for extraction: {file.filename}")
    try:
        # Read the image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        model = genai.GenerativeModel('gemini-1.5-flash')

        # The prompt for image extraction
        prompt = """You are an expert data extraction assistant. Your task is to find all 7-digit case numbers and their corresponding source names from the following image.

The image may be a screenshot of a chat or a document.
- The case number is always exactly 7 digits long.
- The case number may be preceded by the Bengali text \"আবেদন নং\".
- The source is a name of a person, which can be found next to the case number or at the top of the image. If no source is present, the value for source should be null.

Your response must be a JSON object with a single key \"cases\" which is a list of objects. Each object in the list should have two keys: \"case_no\" and \"source\".
"""

        response = model.generate_content([prompt, image])

        # Clean the response to extract only the JSON part
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')

        # Parse the JSON response
        extracted_data = json.loads(cleaned_response)

        logger.info(f"Successfully extracted case data from image: {extracted_data}")
        return extracted_data
    except Exception as e:
        logger.error(f"An error occurred during image processing or Google AI API call: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
