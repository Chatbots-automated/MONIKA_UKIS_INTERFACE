# Kaip pritaikyti Pelningumas (Profitability) pataisymą

## Problema - KRITINĖ

Pelningumas sistemoje medikamentų kainos buvo **NETEISINGOS** dėl dviejų klaidų:

**Klaida 1: Dauginimas 6 kartų (Cartesian Product)**
- Karve **LT000008564183** rodė: **Medikamentų: 18,36 €**
- Turėtų būti: **€3.06**
- Priežastis: 6 vizitai × 6 sinchronizacijos žingsniai = 36 eilutės duomenų bazėje
- Kiekviena eilutė skaičiuoja tą patį €3.06 vaistą → €3.06 × 6 = €18.36 ❌

**Klaida 2: Neteisingas GEA pieno skaičiavimo laikotarpis**
- Rodo "14 d." bet skaičiuoja vidurkį per 90 dienų
- Pavyzdys: Rodo 114.47 L/dieną, bet tikras dabartinis gamyba ~67 L/dieną
- Senesnė gamyba (didesni skaičiai) išpučia vidurkį

## Sprendimas

Sukurtas SQL pataisymas su DVIEM pataisymais:

**Pataisymas 1: Atskirti skaičiavimai (išvengti dauginimo)**
- ✅ Gydymų kaštai skaičiuojami ATSKIRAI
- ✅ Sinchronizacijos kaštai skaičiuojami ATSKIRAI
- ✅ Tada sudedama be dauginimo
- ✅ Skaičiuojami tik užbaigti vizitai

**Pataisymas 2: GEA pieno laikotarpis pakeistas iš 90 į 14 dienų**
- ✅ Dabar rodo tikrą dabartinę gamybą (ne senus duomenis)
- ✅ "14 d." atitinka realų skaičiavimo laikotarpį
- ✅ Tikslesni sprendimai dėl gydymo

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
   - Medikamentų: turėtų būti **€3.06** (ne €18.36) ✅
   - Apsilankymų: turėtų būti **2** (ne 6) ✅
   - Viso: turėtų būti **€23.06** (ne €78.36) ✅

4. **Patikrinkite** "Pieno Gamyba" sekcijoje:
   - Vidutiniškai per dieną: turėtų būti **~67 L** (ne 114 L) ✅
   - Turėtų sutapti su GEA Duomenys skyriumi ✅

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
- ✅ Tikslūs medikamentų kaštai (be dauginimo)
- ✅ Sinchronizacijos vaistai įskaičiuojami
- ✅ Tik užbaigti vizitai skaičiuojami
- ✅ Pieno gamyba atspindi dabartinį (14 d.) laikotarpį
- ✅ Geresni sprendimai dėl gydymo

### ⚠️ SVARBU - Skaičiai pasikeis:

**Medikamentų kaštai SUMAŽĖS:**
- Buvo: padauginti 6 kartų (per daug)
- Dabar: tikri kaštai
- Pavyzdys: €18.36 → €3.06

**Pieno pajamos SUMAŽĖS:**
- Buvo: 90 dienų vidurkis (su senais aukštais skaičiais)
- Dabar: 14 dienų vidurkis (dabartinė gamyba)
- Pavyzdys: 114 L/d → 67 L/d

**Pelningumas kai kurių gyvūnų SUMAŽĖS:**
- Tai yra TEISINGA - dabar matote tikrus dabartinius skaičius
- Kai kurie gyvūnai gali būti MAŽIAU pelningi nei atrodė
- Naudokite naujus skaičius sprendimams dėl gydymo

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
