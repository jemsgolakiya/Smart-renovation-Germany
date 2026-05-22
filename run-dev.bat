@echo off
REM Script to run both Django backend and React frontend in the same terminal

echo ============================================
echo Starting RenovAlte Development Servers
echo ============================================
echo.

REM Check if backend virtual environment exists
if exist "backend\.venv\Scripts\activate.bat" (
    echo [Backend] Virtual environment found
    echo [Backend] Starting Django server in background...
    cd backend
    call .venv\Scripts\activate.bat
    python -m pip install -r requirements.txt >nul 2>&1
    python manage.py makemigrations
    python manage.py migrate
    start /b python manage.py runserver
    cd ..
    echo [Backend] Django server started on http://127.0.0.1:8000
    echo.
) else (
    echo [Backend] Virtual environment not found at backend\.venv
    echo [Backend] Please run the following command to create the virtual environment:
    echo python -m venv .venv
    echo .venv\Scripts\activate.bat
    echo python -m pip install -r requirements.txt
    echo python manage.py makemigrations
    echo python manage.py migrate
    echo python manage.py runserver
    exit /b 1
)

REM Wait a moment before starting frontend
timeout /t 2 /nobreak >nul

REM Start React frontend in foreground
echo [Frontend] Starting React development server...
echo [Frontend] React server will start on http://localhost:3000
echo.
echo ============================================
echo Both servers are running in this terminal!
echo ============================================
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

cd frontend
npm start

