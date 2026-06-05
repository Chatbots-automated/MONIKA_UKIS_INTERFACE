-- Allow date to be NULL to indicate permanent sharing (all days)
ALTER TABLE food_list_shared_with_workers
ALTER COLUMN date DROP NOT NULL;

-- Drop the existing unique constraint
ALTER TABLE food_list_shared_with_workers
DROP CONSTRAINT IF EXISTS food_list_shared_with_workers_date_worker_id_key;

-- Recreate unique constraint that properly handles NULL dates
-- In PostgreSQL, NULL values are considered distinct, so multiple NULLs are allowed
ALTER TABLE food_list_shared_with_workers
ADD CONSTRAINT food_list_shared_with_workers_date_worker_id_key 
UNIQUE (date, worker_id);

-- Add index for NULL date queries (permanent sharing)
CREATE INDEX IF NOT EXISTS idx_food_list_shared_permanent 
ON food_list_shared_with_workers(worker_id) 
WHERE date IS NULL;

-- Add comment explaining NULL date
COMMENT ON COLUMN food_list_shared_with_workers.date IS 
'Date for which the list is shared. NULL means permanent sharing for all days.';
