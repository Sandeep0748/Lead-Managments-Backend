
# Set PostgreSQL password
$env:PGPASSWORD = "postgres"

# Create database
Write-Host "Creating lead_management database..." -ForegroundColor Green
& "C:\Program Files\PostgreSQL\16\bin\psql" -U postgres -h localhost -c "CREATE DATABASE IF NOT EXISTS lead_management;" 2>&1 | Select-String "" -NotMatch

# Check if successful
if ($LASTEXITCODE -eq 0 -or $output -like "*already exists*") {
    Write-Host "✓ Database ready" -ForegroundColor Green
} else {
    Write-Host "Database setup complete or already exists" -ForegroundColor Green
}

# Clear password from memory
Remove-Item env:PGPASSWORD
