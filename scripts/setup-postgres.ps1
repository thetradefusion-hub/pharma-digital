# Creates local PostgreSQL role + database for Pharma Digital Catalogue.
# Usage (PowerShell):
#   $env:PGPASSWORD = "<your postgres superuser password>"
#   .\scripts\setup-postgres.ps1

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psql)) {
  Write-Error "psql not found at $psql. Update the path for your PostgreSQL install."
}

if (-not $env:PGPASSWORD) {
  Write-Error "Set PGPASSWORD to your postgres superuser password before running this script."
}

& $psql -U postgres -v ON_ERROR_STOP=1 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharma') THEN CREATE ROLE pharma LOGIN PASSWORD 'pharma_dev_password'; END IF; END `$`$;"
& $psql -U postgres -v ON_ERROR_STOP=1 -c "SELECT 'CREATE DATABASE pharma_catalogue OWNER pharma' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pharma_catalogue')\gexec"
& $psql -U postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE pharma_catalogue TO pharma;"
& $psql -U postgres -d pharma_catalogue -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO pharma; ALTER SCHEMA public OWNER TO pharma;"

Write-Host "PostgreSQL ready. Next: pnpm db:migrate && pnpm db:seed"
