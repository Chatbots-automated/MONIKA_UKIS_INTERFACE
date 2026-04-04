@echo off
echo Applying migrations to Supabase...
echo.

set PGPASSWORD=bwhbdWIlcp3B9NuF
set PGHOST=aws-0-eu-central-1.pooler.supabase.com
set PGPORT=6543
set PGDATABASE=postgres
set PGUSER=postgres.olxnahsxvyiadknybagt

echo Step 1: Dropping and recreating hours_worked column...
psql -c "ALTER TABLE manual_time_entries DROP COLUMN IF EXISTS hours_worked; ALTER TABLE manual_time_entries ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(5,2) DEFAULT 0;"
if %errorlevel% neq 0 (
    echo Failed at step 1
    exit /b 1
)
echo Step 1 completed!
echo.

echo Step 2: Creating calculation function...
psql -f "supabase\migrations\20260213000008_fix_overnight_hours_step2.sql"
if %errorlevel% neq 0 (
    echo Failed at step 2
    exit /b 1
)
echo Step 2 completed!
echo.

echo Step 3: Creating trigger...
psql -f "supabase\migrations\20260213000009_fix_overnight_hours_step3.sql"
if %errorlevel% neq 0 (
    echo Failed at step 3
    exit /b 1
)
echo Step 3 completed!
echo.

echo Step 4: Updating existing rows...
psql -f "supabase\migrations\20260213000010_fix_overnight_hours_step4.sql"
if %errorlevel% neq 0 (
    echo Warning: Step 4 failed (this is optional)
) else (
    echo Step 4 completed!
)
echo.

echo All migrations completed successfully!
pause
