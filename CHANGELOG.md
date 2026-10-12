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

## 2026-10-12

### 🐛 Fix

- Brukere som ikke var koblet til Spond fant ingen grupper på `/groups` og kom derfor aldri til `/link-spond`. Alle Spond-gruppene vises nå, merket «Ikke koblet» der man ikke er koblet

### 🔒 Sikkerhet

- API-et krever nå at man er koblet til Spond-medlemmet sitt i gruppen for å hente data om den; bare det koblingssiden trenger er åpent for ukoblede

### 🗑️ Fjernet

- Miljøvariabelen `DISPLAY_ALL_GROUPS`, siden alle grupper nå kan velges

### ✨ Feature

- Ny side `/link-spond`: brukere kobler seg selv til Spond-medlemmet sitt ved å bekrefte en kode sendt til e-posten de har i Spond
- Har man ikke tilgang til Spond-e-posten, kan man i stedet be en administrator godkjenne koblingen på admin-siden
- Det er nå påkrevd å være koblet til Spond i den valgte gruppen før man kommer inn på dashboardet
- Nye miljøvariabler for e-post: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Ny side `/dashboard/events` med tabell over arrangementer, filter for kommende/tidligere, statistikk-kort og egen feil-/lastingstilstand
- Undergrupper i sidebar lenker nå til egne sider (`/dashboard/subgroups/<id>`) med medlemstabell, i stedet for å sende brukeren til dashboardet med query-parametre
- Man kan melde inn feil og idéer fra sidebar; innsendte saker vises på admin-siden der status (åpen/lukket/avslått) kan endres
- Listen over innsendte feil er offentlig, og meldings-dialogen viser lignende åpne saker mens du skriver for å unngå duplikater

### ♻️ Endret

- CI-kjøring på Blacksmith-runners i stedet for vanlige GitHub-runners

## 2026-10-08

### ✨ Feature

- Lagt til CI
- Laget `/dashboard/members`-siden

## 2026-10-05

### ♻️ Endret

- Mobil-vennlig UI (Endret "tabs" på dashboard til Select om mobil, + litt endringer i stat-cards og plassering av knappe, vekslende farger på rader i tabeller for å gjøre dem enklere å lese spesielt på mobil)
- Endret routes: /dashboard er nå i \_auth/dashboard/index.tsx. Gjort for å gjøre det mulig å opprette separate sider for arrangementer og medlemsliste, i stedet for sidebar-knapper som bare endrer på "tabs" på dashboardet.
- Endret sidebar-funksjonalitet: Knappene navigerer nå til nye sider i stedet for å endre på aktiv tab på dashboard.
- Endret sidebar-funksjonalitet: Sidebar lukkes ved navigering på mobil.

### ✨ Feature

- Opprettet nye routes for /dashboard/members og /dashboard/events

## 2026-10-05

### ✨ Feature

- `bun run spond:link <spond-epost> <tihlde-epost>` er tilbake: kobler et Spond-medlem til en TIHLDE-e-post fra terminalen, slik at hver utvikler kan sette opp seg selv som administrator i sin lokale database
- Mal for pull requests (`.github/pull_request_template.md`) med beskrivelse, type endring, skjermbilder og sjekkliste

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
