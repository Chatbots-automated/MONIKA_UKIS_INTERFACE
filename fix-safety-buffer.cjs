const { Client } = require('pg');
require('dotenv').config();

// Construct Supabase PostgreSQL connection string
const projectRef = 'olxnahsxvyiadknybagt';
const connectionString = `postgresql://postgres.${projectRef}:${process.env.DATABASE_PASSWORD || '[YOUR_DB_PASSWORD]'}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const sql = `
CREATE OR REPLACE FUNCTION calculate_treatment_milk_loss(
  p_treatment_id uuid
)
RETURNS TABLE (
  withdrawal_days integer,
  safety_days integer,
  total_loss_days integer,
  avg_daily_milk_kg numeric,
  total_milk_lost_kg numeric,
  milk_price_eur_per_kg numeric,
  total_value_lost_eur numeric,
  treatment_date date,
  withdrawal_until date,
  animal_tag text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_treatment_date date;
  v_withdrawal_until date;
  v_animal_id uuid;
  v_animal_tag text;
  v_withdrawal_days integer;
  v_safety_days integer := 0; -- No automatic safety buffer
  v_total_days integer;
  v_avg_milk numeric;
  v_milk_price numeric;
BEGIN
  SELECT
    t.reg_date,
    t.withdrawal_until_milk,
    t.animal_id,
    a.tag_no
  INTO
    v_treatment_date,
    v_withdrawal_until,
    v_animal_id,
    v_animal_tag
  FROM treatments t
  JOIN animals a ON a.id = t.animal_id
  WHERE t.id = p_treatment_id;

  IF v_treatment_date IS NULL OR v_withdrawal_until IS NULL THEN
    RETURN QUERY SELECT
      0, 0, 0,
      0::numeric, 0::numeric, 0::numeric, 0::numeric,
      NULL::date, NULL::date, NULL::text;
    RETURN;
  END IF;

  v_withdrawal_days := (v_withdrawal_until - v_treatment_date);
  v_total_days := v_withdrawal_days; -- No safety buffer added
  v_avg_milk := get_animal_avg_milk_at_date(v_animal_id, v_treatment_date);

  SELECT COALESCE(setting_value::numeric, 0.45)
  INTO v_milk_price
  FROM system_settings
  WHERE setting_key = 'milk_price_per_liter'
  LIMIT 1;

  RETURN QUERY SELECT
    v_withdrawal_days,
    v_safety_days,
    v_total_days,
    v_avg_milk,
    v_avg_milk * v_total_days,
    v_milk_price,
    (v_avg_milk * v_total_days) * v_milk_price,
    v_treatment_date,
    v_withdrawal_until,
    v_animal_tag;
END;
$func$;
`;

async function applyFix() {
  console.log('🔧 Removing automatic 1-day safety buffer from withdrawal calculations...\n');
  console.log('⚠️  This script requires your Supabase database password.\n');
  console.log('📋 Please apply this fix using Supabase Dashboard SQL Editor:');
  console.log('   1. Visit: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new');
  console.log('   2. Copy and paste the SQL below');
  console.log('   3. Click "Run"\n');
  console.log('═'.repeat(80));
  console.log(sql);
  console.log('═'.repeat(80));
  console.log('\n✅ After running, withdrawal periods will show exact days:');
  console.log('   Before: 2025-12-02 - 2025-12-07 → 5 d. + 1 d. (saugumas) = 6 d.');
  console.log('   After:  2025-12-02 - 2025-12-07 → 5 d. + 0 d. (saugumas) = 5 d.\n');
}

applyFix();
