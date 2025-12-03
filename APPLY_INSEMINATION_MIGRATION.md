# Sėklinimo Sistema - Migracija

## Apie šią migraciją

Ši migracija sukuria visą sėklinimo (artificial insemination) valdymo sistemą:

1. **Naujos lentelės:**
   - `insemination_products` - Spermos ir pirštinių produktai
   - `insemination_inventory` - Atsargų apskaita
   - `insemination_records` - Sėklinimo įrašai su nėštumo stebėjimu

2. **Duomenų pildymas:**
   - 4 pirštinių produktai (GLOVES)
   - 12 spermos produktų (SPERM)
   - Visi iš PASARU GRUPE tiekėjo

3. **Funkcionalumas:**
   - Sėklinimo įrašų valdymas
   - Atsargų sekimas ir nurašymas
   - Nėštumo patvirtinimas ir statistika
   - Integracija su sinchronizacijomis

## Kaip pritaikyti migračiją

### Metodas 1: Per Supabase Dashboard (Rekomenduojama)

1. Eikite į: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor

2. Spauskim "SQL Editor" kairėje pusėje

3. Atidarykite failą: `supabase/migrations/20251203000000_create_insemination_system.sql`

4. Nukopijuokite VISĄ failo turinį

5. Įklijuokite į SQL Editor

6. Spauskite "Run" arba Ctrl+Enter

7. Patikrinkite, ar nėra klaidų

### Metodas 2: Su slaptažodžiu

Jeigu turite duomenų bazės slaptažodį:

```bash
DB_PASSWORD=your_password_here node apply_insemination_migration.js
```

## Patikrinimas

Po migracijos galite patikrinti, ar visos lentelės sukurtos:

```sql
-- Patikrinti produktus
SELECT product_type, COUNT(*)
FROM insemination_products
GROUP BY product_type;

-- Turėtų rodyti:
-- GLOVES: 4
-- SPERM: 12
```

## Galimi klausimai

### Klaida: "table already exists"

Tai normalu, jeigu migracija jau buvo pritaikyta. Galite ignoruoti.

### Klaida: "permission denied"

Įsitikinkite, kad naudojate Service Role key arba prisijungę kaip administratorius.

### Nematau naujų lentelių

1. Pabandykite atnaujinti Supabase Dashboard puslapį
2. Patikrinkite "Table Editor" skyriuje, ar lentelės yra
3. Galite bandyti SQL: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'insemination%';`

## Pagalba

Jei kyla problemų:
1. Patikrinkite, ar turite teises prie duomenų bazės
2. Pabandykite prisijungti per Supabase Dashboard SQL Editor
3. Užtikrinkite, kad Supabase projektas veikia (žalia lemputė Dashboard)
