# Pietūs (Food) Module Implementation

## Overview
The Pietūs module allows workers to mark their daily food preferences and enables admins to view and manage food orders.

## Features Implemented

### Worker Features
1. **Food Preferences Tab** - New "Pietūs" tab in worker portal
2. **Daily View** - Quick toggle for today's food preference
3. **Weekly View** - Plan food for the entire week ahead
4. **Bulk Actions** - Set preferences for the whole week at once
5. **Visual Feedback** - Clear indication of marked/unmarked preferences
6. **Deadline Warning** - Reminder about marking deadline (10 AM)

### Admin Features
1. **Daily Summary** - View food orders by location (Farm/Warehouse)
2. **Worker Lists** - See who wants food and who hasn't responded
3. **Date Navigation** - Browse food orders for any date
4. **Export to CSV** - Download food orders for kitchen
5. **Statistics** - Total counts and response rates

## Files Created

### Database Migration
- `supabase/migrations/20260405000000_create_food_preferences.sql`
  - Creates `worker_food_preferences` table
  - Creates `daily_food_summary` view
  - Adds helper function `set_weekly_food_preferences`

### Frontend Components
- `src/components/worker/WorkerFoodPreferences.tsx` - Worker food preference interface
- `src/components/FoodManagement.tsx` - Admin food management dashboard

### Modified Files
- `src/components/worker/WorkerPortal.tsx` - Added Pietūs tab
- `src/components/AdminDashboard.tsx` - Added Pietūs admin section

## Database Schema

### worker_food_preferences Table
```sql
- id (uuid, primary key)
- worker_id (uuid, references users)
- date (date)
- wants_food (boolean)
- work_location (text: 'farm' or 'warehouse')
- marked_at (timestamptz)
- marked_by (uuid, references users)
- notes (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE constraint on (worker_id, date)
```

### daily_food_summary View
Aggregates daily food preferences by location with worker lists.

## How to Apply the Migration

### Option 1: Supabase SQL Editor (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file: `supabase/migrations/20260405000000_create_food_preferences.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to execute the migration

### Option 2: Command Line (if connection works)
```bash
npx tsx scripts/apply_food_migration.ts
```

## Usage Instructions

### For Workers
1. Log in with worker credentials (farm_worker or warehouse_worker role)
2. Click on the "Pietūs" tab in the navigation
3. Choose between "Šiandien" (Today) or "Savaitė" (Week) view
4. Mark food preferences:
   - **Today view**: Click "Noriu pietų" (Want food) or "Nenoriu pietų" (Don't want food)
   - **Week view**: Set preferences for each day individually or use bulk actions
5. Preferences are saved automatically

### For Admins/Managers

**Option 1: Via Ūkio Infrastruktūra Module**
1. Log in with admin credentials
2. From the main module selector, click "Ūkio Infrastruktūra"
3. Click on the "Pietūs" card (orange card with utensils icon)
4. View daily food orders:
   - See counts by location (Farm/Warehouse)
   - View worker lists
   - Check who hasn't responded
5. Navigate between dates using arrow buttons
6. Export to CSV for kitchen using "Eksportuoti" button

**Option 2: Via Admin Dashboard**
1. Log in with admin credentials
2. Go to "Administratoriaus pultas" (Admin Dashboard)
3. Click on the "Pietūs" tab
4. Same functionality as above

## Key Features

### Accountability System
- Workers must mark their preference before 10 AM deadline (configurable)
- System tracks who marked and when
- Admin can see who hasn't responded
- Clear warning: "If you don't mark by 10:00, no food will be prepared"

### Flexible Planning
- Workers can mark for today only
- Or plan the entire week ahead
- Bulk actions: "Want food all week" or "Don't want food all week"
- Individual day overrides available

### Admin Visibility
- Real-time view of food orders
- Separate counts for Farm and Warehouse
- Worker names with timestamps
- Export functionality for kitchen staff
- Historical data access (view past dates)

## Technical Details

### State Management
- React hooks (useState, useEffect)
- Supabase real-time subscriptions possible (not implemented yet)
- Local state with server sync

### Styling
- Tailwind CSS for consistent design
- Lucide React icons
- Responsive design
- Color coding:
  - Orange: Food/Lunch theme
  - Green: Farm workers
  - Slate: Warehouse workers

### Data Flow
1. Worker marks preference → Saved to `worker_food_preferences` table
2. Admin views dashboard → Queries `worker_food_preferences` with joins
3. Export → Generates CSV from current view

## Future Enhancements (Optional)

1. **Notifications**
   - Remind workers who haven't marked by 9 AM
   - Alert admin of low response rates

2. **Meal Types**
   - Add breakfast, lunch, dinner options
   - Multiple meals per day

3. **Dietary Preferences**
   - Vegetarian, allergies, etc.
   - Special requests field

4. **Analytics**
   - Weekly/monthly trends
   - Worker food patterns
   - Cost calculations

5. **Real-time Updates**
   - Live counter updates as workers mark preferences
   - Push notifications

## Testing Checklist

- [ ] Worker can log in and see Pietūs tab
- [ ] Worker can mark food preference for today
- [ ] Worker can mark food preferences for the week
- [ ] Bulk actions work (set whole week)
- [ ] Admin can view daily food orders
- [ ] Admin can see separate counts for Farm/Warehouse
- [ ] Admin can see who hasn't responded
- [ ] Date navigation works
- [ ] CSV export works
- [ ] Preferences persist after page refresh
- [ ] Multiple workers can mark independently

## Troubleshooting

### Migration Issues
If the migration fails:
1. Check database connection
2. Verify service role key is correct
3. Run SQL manually in Supabase SQL Editor

### Worker Can't See Pietūs Tab
1. Verify user role is 'farm_worker' or 'warehouse_worker'
2. Check work_location field is set
3. Clear browser cache and reload

### Admin Can't See Food Orders
1. Verify user role is 'admin'
2. Check that workers have marked preferences
3. Verify date is correct

## Support
For issues or questions, check:
1. Browser console for errors
2. Supabase logs for database errors
3. Network tab for API call failures
