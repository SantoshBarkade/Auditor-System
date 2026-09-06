import sys
import os

# Guarantee project root and backend are on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for p in (parent_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

# Re-export the existing authoritative FastAPI application
from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
