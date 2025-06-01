@echo off
echo Performing final project cleanup...

REM Remove temporary cleanup scripts
echo Removing temporary cleanup scripts...
del /q frontend\cleanup.bat
del /q backend\cleanup.bat

REM Remove any temporary files in the project root
echo Checking for other temporary files...
del /q *.tmp 2>nul
del /q *.bak 2>nul

echo Final cleanup complete!
echo Project is now clean and optimized.
