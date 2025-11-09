/*
  Clear All Inventory Data (Keep Products)

  This script will:
  1. Delete all usage_items (treatment usage records)
  2. Delete all batches (stock batches)
  3. Keep all products intact

  WARNING: This will permanently delete all inventory and usage history!
*/

-- First, delete all usage items (they reference batches)
DELETE FROM usage_items;

-- Then delete all batches
DELETE FROM batches;

-- Verify the cleanup
SELECT
  (SELECT COUNT(*) FROM products) as products_remaining,
  (SELECT COUNT(*) FROM batches) as batches_remaining,
  (SELECT COUNT(*) FROM usage_items) as usage_items_remaining;
