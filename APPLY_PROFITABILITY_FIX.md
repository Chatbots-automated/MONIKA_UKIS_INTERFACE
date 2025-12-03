# Kaip pritaikyti Pelningumas (Profitability) pataisymą

## Problema

Pelningumas sistemoje medikamentų kainos rodė **0,00 €**, nors gyvūnas turėjo sinchronizacijos vizitus su vaistais.

Pavyzdys su karve **LT000008564183**:
- Turėjo 6 vizitus (2 užbaigti)
- Naudojo Enzaprost ir Ovarelin
- Bet rodė: **Medikamentų: 0,00 €** ❌

## Sprendimas

Sukurtas SQL pataisymas, kuris:
- ✅ Įtraukia vaistų kainas iš vizitų (ne tik iš gydymų)
- ✅ Skaičiuoja tik užbaigtus vizitus (ne planuotus)
- ✅ Tinkamai prideda sinchronizacijos vaistų kainas

## Kaip pritaikyti

### Būdas 1: Per Supabase Dashboard (Rekomenduojama)

1. Eikite į: https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/editor

2. Spauskite "SQL Editor" kairėje pusėje

3. Atidarykite failą: `fix_profitability_medication_costs.sql`

4. Nukopijuokite VISĄ failo turinį

5. Įklijuokite į SQL Editor

6. Spauskite "Run" arba Ctrl+Enter

### Būdas 2: Su slaptažodžiu

```bash
DB_PASSWORD=your_password_here node apply_profitability_fix.js
```

## Patikrinimas

Po pataisymo pritaikymo:

1. **Atnaujinkite** Pelningumas puslapį naršyklėje (F5)

2. **Spauskite** ant karves LT000008564183

3. **Patikrinkite** "Gydymo Kaštai" sekcijoje:
   - Medikamentų: dabar turėtų rodyti kainą (ne 0,00 €) ✅
   - Apsilankymų: turėtų būti 2 (ne 6) ✅
   - Viso: turėtų būti ~20-25 € (ne 60 €) ✅

4. **Palyginkite** su "Vaistų Panaudojimas" skyriumi:
   - Suraskite Enzaprost produktą
   - Patikrinkite kainas šiai karvei
   - Turėtų sutapti ✅

## Kas pasikeitė

- **Duomenų bazės vaizdas (view):** `vw_animal_profitability` - atnaujintas skaičiavimas
- **Duomenys:** Nepasikeitė, tik skaičiavimo logika
- **Veikimas:** Minimalus poveikis, vienas papildomas JOIN

## Poveikis

Po pataisymo:
- ✅ Tikslūs pelningumas skaičiavimai
- ✅ Teisingos gydymo kainos
- ✅ Sinchronizacijos vaistai įskaičiuojami
- ⚠️ Kai kurių gyvūnų pelningumas SUMAŽĖS (nes kaštai buvo per maži)
- ⚠️ Tai yra TEISINGA - dabar matote tikras kainas

## Pastabos

### Apie GEA pieno duomenis

**Problema:**
- Pelningumas rodo 114.55 L vidurkis
- GEA duomenys rodo 67.1 L vidurkis

**Priežastis:**
- Sistema skaičiuoja per 90 dienų
- Gali būti senesni didesnės gamybos duomenys
- Bus pataisyta kitame atnaujinime

### Jei kyla problemų

1. Patikrinkite, ar prisijungę prie Supabase
2. Pabandykite atnaujinti puslapį
3. Patikrinkite, ar SQL kodas įvykdytas be klaidų
4. Parašykite man, jei vis tiek nerodo teisingai

## Pagalba

Jei neveikia arba turite klausimų:
- Perskaitykite `PROFITABILITY_BUG_FIX.md` detaliai informacijai
- Patikrinkite SQL Editor ar nėra klaidų pranešimų
- Pabandykite dar kartą paleisti SQL

---

**Sukurta:** 2025-12-03
**Failas:** fix_profitability_medication_costs.sql
**Testas:** Karve LT000008564183
