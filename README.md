# SnackOfYourDay V2

V2 bringt folgende Verbesserungen:

- moderner virtueller Automat statt einfachem Slot-Raster
- Browser-Tab nicht mehr `combatcart15`, sondern `SnackOfYourDay`
- dynamischer Seitentitel pro Kunde, z. B. `Swisscom Test`
- dynamisches Favicon je Kunde auf Basis von Name + Farben
- verbesserte Farbauswahl im Superadmin mit Vorschau + Hex-Wert
- Build getestet mit Netlify / Vite / Supabase

## Deploy

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Hinweis

Wenn du bereits eine laufende Netlify-Site hast, kannst du diese Version einfach über GitHub hochladen und neu deployen.
