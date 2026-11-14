@echo off
echo Starting StatQ FastAPI Backend on http://127.0.0.1:8000...
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000 --host 127.0.0.1 --reload
pause
