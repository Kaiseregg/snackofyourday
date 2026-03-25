# SnackOfYourDay V6 Pro

## Wichtig vor Deploy
Nicht hochladen:
- node_modules
- dist
- package-lock.json

Drin lassen:
- .node-version
- netlify.toml

## Supabase
1. `supabase/v6_upgrade.sql` im SQL Editor ausführen
2. Bucket `vendora-assets` in Storage anlegen (public)
3. Auth Redirects:
   - Site URL: `https://DEINE-SITE.netlify.app`
   - Redirect URLs: `https://DEINE-SITE.netlify.app/**`

## Netlify ENV
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Rollen
- Superadmin: `profiles.role = 'superadmin'`
- Kunden-Admin: `profiles.role = 'customer_admin'` und `profiles.tenant_id = <kunde>`

## Hinweise
- Stripe/TWINT ist in V6 **payment-ready**, aber nicht live-funktional ohne deinen echten Stripe/Provider-Backend-Flow.
- `Interne Monatsabrechnung` und `TWINT Telefonnummer` sind sofort nutzbar als manuelle Zahlungsarten.
