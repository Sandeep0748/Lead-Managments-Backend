@echo off
REM Initialize PostgreSQL database
SET "PGPASSWORD=postgres"
& "C:\Program Files\PostgreSQL\16\bin\psql" -U postgres -h localhost -c "CREATE DATABASE IF NOT EXISTS lead_management;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database created successfully
) else (
    echo ✗ Failed to create database. PostgreSQL may need password setup.
    echo Try: ALTER USER postgres WITH PASSWORD 'postgres';
)
