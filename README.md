# Živatkauskų ūkis - GVET PRO

Veterinary Management System for Živatkauskų ūkis farm.

## Features

- **Veterinary Module** - Complete veterinary management (animals, treatments, vaccinations, medications)
- **Stock Management** - FIFO stock allocation, batch tracking, expiry management
- **GEA Integration** - Milk production data integration
- **Milk Testing** - Lab test results and quality tracking
- **Hoof Health** - Hoof trimming and treatment records
- **Reproduction** - Insemination tracking
- **User Management** - Role-based access control

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Push database migrations:
```bash
npx supabase db push
```

4. Create test admin user:
```bash
npx ts-node scripts/create_test_admin.ts
```

5. Start development server:
```bash
npm run dev
```

## Test Admin Credentials

After running the setup script, you can login with:
- **Email**: admin@zivatkauskuukis.lt
- **Password**: admin123

## Database

The system uses a comprehensive PostgreSQL/Supabase database with:
- 44 tables
- 40+ functions
- 25+ views
- Complete RLS security
- FIFO stock management
- Automated triggers

See `supabase/migrations/20260607000000_vet_baseline.sql` for the complete schema.

## License

© 2025 Živatkauskų ūkis. All rights reserved.
