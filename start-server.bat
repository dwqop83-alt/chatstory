@echo off
echo ChatStory Server (auto-restart)
echo http://localhost:8080
echo.
:loop
node server.js
echo.
echo Server stopped, restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
