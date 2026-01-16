@echo off
set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" -U postgres -h localhost -d attendance_db --no-owner --no-acl -f "C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\local_backup.sql"
echo Done - Exit code: %ERRORLEVEL%
