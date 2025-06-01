@echo off
echo Starting Zomato Project (MERN Stack)...
echo.

echo Starting Backend Server...
start cmd /k "cd backend && npm start"

echo.
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start cmd /k "cd frontend && npm start"

echo.
echo Both servers are now running!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop both servers...
pause > nul

echo.
echo Stopping servers...
taskkill /f /im node.exe > nul 2>&1
echo Done!
