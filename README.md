# Vendora V1

Multi-Tenant Webautomat mit Subpfad-Struktur:
- `/superadmin/login`
- `/:tenantSlug`
- `/:tenantSlug/admin/login`

## Lokal starten
1. `npm install`
2. `.env.example` nach `.env` kopieren
3. Supabase URL + Anon Key eintragen
4. `npm run dev`

## Was ist drin
- Superadmin Dashboard: Kunden anlegen
- Kunden-URL über Subpfad, z.B. `/swisscom`
- Kunden-Admin Dashboard: Produkte, Slots, Bestellungen
- Öffentliche Bestellung + Zahlungsseite
- Demo-Mandant `/demo`

## Wichtige Hinweise
- Bildupload ist in dieser V1 noch nicht eingebaut. Produkte nutzen aktuell Name + Preis.
- Zahlung ist als strukturierte Anzeige vorbereitet. Echte TWINT-/Kreditkarten-Bestätigung braucht später Provider-Anbindung.
- Kunden-Admin-Zuweisung läuft über `profiles` in Supabase.

## Erster Setup-Ablauf
1. SQL aus `supabase/schema.sql` komplett in Supabase SQL Editor ausführen.
2. In Supabase Auth einen User für dich erstellen.
3. Danach im SQL Editor einmal ausführen:
   ```sql
   update public.profiles
   set role = 'superadmin'
   where email = 'DEINE-EMAIL';
   ```
4. In Netlify Umgebungsvariablen setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy auf Netlify.
6. Auf `/superadmin/login` einloggen.
7. Kunden erstellen, z.B. `swisscom`.
8. Kunde ist erreichbar unter `/swisscom`.
9. Kunde-Admin erstellt sich zuerst einen Auth-User. Danach im Superadmin Dashboard per E-Mail diesem Kunden zuweisen.

## Empfohlene V2
- Storage Upload für Produktbilder / Logos
- echtes Theme-Builder UI
- Zahlungsprovider Webhooks
- Rollen `staff`, `viewer`, `manager`
- echte Lizenzverwaltung
