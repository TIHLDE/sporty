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

## 2026-10-08

### ✨ Feature

- Gruppevalg (`/groups`): etter innlogging velger man hvilken Spond-gruppe man vil se. Siden viser logo, sport, antall medlemmer og undergrupper for hver gruppe. Har man bare én gruppe, velges den automatisk. Nederst står hvem man er innlogget som, og man kan logge ut derfra (også når man ikke har tilgang til noen grupper).
- Spinner (Wave Helix fra UIAble) på gruppekortet mens gruppen velges. UIAble-registeret (`@uiable`) er lagt til i `apps/web/components.json`, så flere komponenter kan hentes med `bunx shadcn add @uiable/<navn>`.
- Valgt gruppe huskes i en cookie (`sporty-group`) og gjelder hele appen: oversikt, statistikk, medlemmer, bøter og admin.
- Bytt gruppe fra sidebaren: gruppenavnet øverst (med gruppens logo) lenker til `/groups`.
- Ny env-variabel `DISPLAY_ALL_GROUPS` (standard `false`). Med `false` ser man bare grupper der man er medlem i Spond, eller der man er medlem av TIHLDE-gruppen som er koblet til Spond-gruppen på admin-siden. Sett den til `true` lokalt for å se alle gruppene under utvikling.
- Sport vises på norsk med stor forbokstav (f.eks. «football» → «Fotball»), og antall står i riktig entall/flertall («1 medlem»).

### ♻️ Endret

- Innlogging sender nå til `/groups` i stedet for `/dashboard`. Sider under `/dashboard` sender til `/groups` hvis ingen gruppe er valgt, eller hvis man har mistet tilgangen til gruppen man valgte. Er man ikke medlem av noen grupper, sier `/groups` det tydelig og forklarer hvordan man får tilgang.
- API-et bruker valgt gruppe når `groupId` ikke er oppgitt, i stedet for alltid den første gruppen Spond-kontoen er med i.

### 🗑️ Fjernet

- Søkeparameteren `?group=` på dashboard-sidene (erstattet av gruppevalget).

### 🔒 Sikkerhet

- Med `DISPLAY_ALL_GROUPS=false` sjekker API-et tilgang for hver forespørsel. Man får ikke hentet data for en gruppe man ikke er med i, verken med `groupId` eller ved å endre cookien.

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
