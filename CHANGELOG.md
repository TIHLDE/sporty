# Changelog

Alle merkbare endringer i Sporty dokumenteres her. Nyeste øverst.

## Kategorier

- **✨ Feature**: ny funksjonalitet
- **🐛 Fix**: feilretting
- **♻️ Endret**: endring i eksisterende funksjonalitet (oppførsel, UI, refaktorering)
- **🗑️ Fjernet**: funksjonalitet som er tatt bort
- **🔒 Sikkerhet**: sikkerhetsrelaterte endringer

## Mal

Kopier denne blokken til toppen av listen under, og ta bare med kategoriene som er i bruk:

```md
## YYYY-MM-DD

### ✨ Feature
- Kort beskrivelse av hva som er nytt

### 🐛 Fix
- Kort beskrivelse av hva som ble fikset
```

---

## 2026-10-05

### ✨ Feature
- `bun run spond:link <spond-epost> <tihlde-epost>` er tilbake: kobler et Spond-medlem til en TIHLDE-e-post fra terminalen, slik at hver utvikler kan sette opp seg selv som administrator i sin lokale database

### 🐛 Fix
- Koblingsscriptet leser `.env` fra repo-roten (som appen) i stedet for `apps/web/.env`, som ikke finnes

## 2026-09-30

### ✨ Feature
- Velg hvilken paragraf i lovverket som er brutt når fellesbøter gis (standard er paragrafen fra bøteoppsettet)
- Ny forside med animert ballbakgrunn (Ballpit fra React Bits) og «Logg inn»-knapp
- Animert «Sporty»-logo (Tech Text fra React Bits): bokstavene får stiplet omriss under musepekeren og kan dras

### ♻️ Endret
- `/login` sender deg til forsiden

### 🔒 Sikkerhet
- Innlogging og registrering er kun mulig med TIHLDE-konto; e-post/passord er skrudd av

## 2026-09-29

### ✨ Feature
- UI-integrasjon med shadcn
- Integrasjon med botsystem, inkludert automatiske bøter
- Kobling mellom TIHLDE- og Sporty-bruker via admin
- Historikk

## 2026-09-28

### ✨ Feature
- Autentisering (Better Auth)
- Spond-pakke
- Første oppsett av prosjektet
