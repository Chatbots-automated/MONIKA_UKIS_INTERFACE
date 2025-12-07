# Notepad Feature Setup

## Overview

A simple notepad feature has been added to the application. Users can now open a side panel to write and save notes.

## Features

- **Side Panel**: Opens from the right side of the screen
- **Auto-Save**: Notes are automatically saved after 1 second of inactivity
- **Persistent Storage**: Notes are stored in the database per user
- **Simple Interface**: Clean, distraction-free writing area

## Database Migration

To enable this feature, you need to run the database migration that creates the `user_notes` table.

### Option 1: Run with Database Password

```bash
DB_PASSWORD=your_password_here node apply_user_notes_migration_pg.js
```

### Option 2: Run SQL Manually

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql)
2. Copy the contents of `supabase/migrations/20251207000000_create_user_notes.sql`
3. Paste and run in the SQL Editor

## How to Use

1. Look for the **Užrašinė** (Notepad) button in the top right header (yellow/amber color with sticky note icon)
2. Click the button to open the notepad panel
3. Start writing - your notes will auto-save
4. Click the X button or click outside the panel to close it

## Technical Details

- **Database Table**: `user_notes`
- **Row Level Security**: Enabled - users can only access their own notes
- **Component**: `src/components/Notepad.tsx`
- **Auto-save Delay**: 1000ms (1 second)
