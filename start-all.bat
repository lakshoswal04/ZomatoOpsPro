@echo off
echo Starting Zomato Project (MERN Stack)
echo ===================================

REM Set environment variables for backend
set PORT=5000
set JWT_SECRET=zomatosecret
set MONGO_URI=mongodb+srv://lakshoswal04:lakshoswal040306@cluster0.exbg41d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

echo Environment variables set:
echo PORT=%PORT%
echo JWT_SECRET=%JWT_SECRET%
echo MONGO_URI=%MONGO_URI%

REM Start backend server in a new window
echo Starting backend server on port %PORT%...
start cmd /k "cd /d %~dp0backend && npm start"

REM Wait for backend to initialize
echo Waiting for backend to initialize (5 seconds)...
timeout /t 5 /nobreak > nul

REM Start frontend server in a new window
echo Starting frontend server...
start cmd /k "cd /d %~dp0frontend && npm start"

echo Both servers should be starting now.
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo If you encounter any issues, check the console windows for error messages.
echo.
pause
