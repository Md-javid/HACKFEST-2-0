@echo off
title PolicyPulse AI - Backend
cd /d "c:\Users\conne\OneDrive\Documents\HACKFEST-2-0\backend"
set PYTHONPATH=c:\Users\conne\OneDrive\Documents\HACKFEST-2-0\backend
C:\Users\conne\AppData\Local\Programs\Python\Python313\python.exe -m uvicorn main:app --reload --port 8000
pause
