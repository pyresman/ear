# Deployment Anleitung für EARBOMB

## Übersicht

EARBOMB besteht aus zwei Teilen:
1. **Frontend**: Statische Webseite (HTML, CSS, JavaScript) - wird auf Netlify gehostet
2. **Backend**: Cloudflare Worker mit D1-Datenbank - verarbeitet Audio-Nachrichten

## Schritt 1: Cloudflare Worker deployen

### Voraussetzungen
- Cloudflare Account (kostenlos)
- Wrangler CLI installiert: `npm install -g wrangler` (falls nicht schon vorhanden)

### Deployment
1. Authentifiziere dich mit Wrangler:
   ```bash
   npx wrangler login
   ```

2. D1-Datenbank erstellen (falls nicht schon vorhanden):
   ```bash
   npx wrangler d1 create earbomb-db
   ```
   Notiere die `database_id` und aktualisiere sie in `wrangler.toml`.

3. Datenbank-Schema einrichten:
   ```bash
   npx wrangler d1 execute earbomb-db --local --file=./schema.sql
   ```

4. Worker deployen:
   ```bash
   npm run deploy
   ```
   oder
   ```bash
   npx wrangler deploy
   ```

5. Nach erfolgreichem Deployment erhältst du eine URL wie:
   ```
   https://earbomb.<dein-account>.workers.dev
   ```
   Notiere diese URL für Schritt 3.

## Schritt 2: Netlify Frontend deployen

### Voraussetzungen
- Netlify Account (kostenlos)
- Git Repository mit dem Code

### Deployment
1. Gehe zu [Netlify](https://app.netlify.com/)
2. Klicke auf "Add new site" → "Import an existing project"
3. Verbinde mit GitHub/GitLab oder lade das Verzeichnis per Drag&Drop hoch
4. Konfiguriere die Build-Einstellungen:
   - **Build command**: (leer lassen)
   - **Publish directory**: `public`
5. Klicke auf "Deploy site"

6. Nach dem Deployment erhältst du eine URL wie:
   ```
   https://<dein-site>.netlify.app
   ```

## Schritt 3: Domain-Konfiguration (earbomb.org)

### Option A: Domain auf Netlify (empfohlen)
1. In Netlify: Site Settings → Domain Management → Add custom domain
2. Domain `earbomb.org` hinzufügen (und `www.earbomb.org`)
3. DNS-Einträge bei deinem Domain-Provider auf Netlify's Nameserver umstellen

### Option B: Subdomain für API
Falls du die Domain auf Netlify hostest, brauchst du eine Subdomain für die API:

1. Erstelle einen CNAME-Eintrag bei deinem DNS-Provider:
   ```
   api.earbomb.org CNAME -> <dein-worker>.workers.dev
   ```

2. Aktualisiere `public/config.js`:
   ```js
   window.API_BASE_URL = 'https://api.earbomb.org';
   ```

### Option C: Domain auf Cloudflare
Falls du die Domain direkt auf Cloudflare zeigst:
1. In Cloudflare DNS: A/AAAA Records für `earbomb.org` auf Netlify IPs zeigen lassen
2. Worker-Route einrichten: `earbomb.org/*` auf den Worker

## Schritt 4: Konfiguration

### Netlify Environment Variables (optional)
Falls du die API-URL über Environment Variables setzen möchtest:

1. In Netlify: Site Settings → Environment Variables
2. Füge hinzu:
   ```
   API_BASE_URL = https://api.earbomb.org
   ```

3. Aktualisiere `public/config.js` um die Variable zu lesen:
   ```js
   window.API_BASE_URL = process.env.API_BASE_URL || 'https://api.earbomb.org';
   ```
   (Dafür benötigst du einen Build-Step, der die Variable ersetzt)

### Aktuelle Konfiguration
Die aktuelle `config.js` verwendet:
```js
window.API_BASE_URL = 'https://api.earbomb.org';
```

Passe diesen Wert entsprechend deiner Setup an.

## Schritt 5: Testing

1. Öffne deine Netlify-URL (z.B. `https://earbomb.org`)
2. Teste die Audio-Aufnahme und Code-Generierung
3. Teste das Abspielen eines Codes

## Step 6: Current Deployment Status

### Live URLs:
- **GitHub Repository**: https://github.com/pyresman/ear
- **Netlify Frontend**: https://earbomb.netlify.app
- **Vercel Frontend**: https://earbomb.vercel.app
- **Cloudflare Worker API**: https://api.earbomb.org
- **Admin Panel**: https://earbomb.netlify.app/admin.html (password: `A123`)

### Deployment Verification:
1. ✅ **GitHub**: Code is up to date with all features (banners, sharing, QR codes)
2. ✅ **Netlify**: Auto-deploys from GitHub, frontend is live
3. ✅ **Vercel**: Static deployment configured, frontend is live
4. ✅ **Cloudflare Worker**: API is live and responding
5. ⚠️ **DNS Configuration**: Needs manual setup (see Step 7)

## Step 7: DNS Configuration (earbomb.org)

### Current DNS Setup:
- `api.earbomb.org` → Cloudflare Worker (already configured via wrangler.toml route)
- `earbomb.org` → Currently points to Cloudflare (needs to point to Netlify or Vercel)

### Option A: Netlify as Primary Domain (Recommended)
1. Go to Netlify Dashboard: https://app.netlify.com/
2. Select your site "earbomb"
3. Go to **Site Settings** → **Domain Management** → **Add custom domain**
4. Add `earbomb.org` and `www.earbomb.org`
5. Netlify will provide DNS records to configure at your domain registrar
6. Update DNS at your registrar to point to Netlify's nameservers or add A/CNAME records:
   ```
   earbomb.org → Netlify load balancer IPs
   www.earbomb.org → earbomb.netlify.app (CNAME)
   api.earbomb.org → [Keep existing Cloudflare Worker route]
   ```

### Option B: Vercel as Primary Domain
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project "earbomb"
3. Go to **Settings** → **Domains**
4. Add `earbomb.org` and `www.earbomb.org`
5. Configure DNS records at your registrar as instructed by Vercel

### Option C: Cloudflare as DNS Provider (Keep domain on Cloudflare)
If your domain is already using Cloudflare DNS:
1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Select your domain
3. Go to **DNS** → **Records**
4. Update existing records:
   - **A record** for `earbomb.org` → Netlify IPs (or Vercel IPs)
   - **CNAME record** for `www` → earbomb.netlify.app (or earbomb.vercel.app)
   - **CNAME record** for `api` → [Keep pointing to Cloudflare Worker]

### Testing DNS Configuration:
After DNS changes propagate (can take up to 48 hours):
1. Test frontend: https://earbomb.org
2. Test API: https://api.earbomb.org/api/config
3. Test admin panel: https://earbomb.org/admin.html

## Step 8: Banner Configuration and Admin Panel

### Banner System
EARBOMB now includes a configurable banner advertising system with the following features:

1. **Banner Modes**:
   - `none`: No banners displayed
   - `single`: One banner (uses Banner 1 HTML)
   - `double`: Two banners (uses Banner 1 and 2 HTML)
   - `triple`: Three banners (uses all three HTML slots)

2. **Banner Types**:
   - `large`: 728x90 pixels
   - `medium`: 468x60 pixels  
   - `small`: 320x100 pixels

3. **Banner Positions**:
   - `top`: Banners appear at top of page
   - `bottom`: Banners appear at bottom of page
   - `both`: Banners distributed between top and bottom

### Admin Panel Access
Access the admin panel at: `https://earbomb.org/admin.html`

**Default Admin Password**: `A123`

**Admin Panel Features**:
1. Configure banner settings (mode, type, position)
2. Edit banner HTML content (supports any HTML including images, links, ads)
3. Customize banner colors (background, border, text)
4. View and delete recent messages
5. Change admin password

### Banner Configuration via Admin Panel
1. Log in with the admin password
2. Navigate to the "Configuration" tab
3. Adjust banner settings:
   - Select banner mode (single/double/triple)
   - Choose banner size (large/medium/small)
   - Set banner position (top/bottom/both)
4. Enter HTML content for each banner slot
   - Banner 1: Primary banner (used in single mode)
   - Banner 2: Secondary banner (used in double/triple mode)
   - Banner 3: Tertiary banner (used in triple mode)
5. Customize colors using CSS values (hex, rgba, etc.)
6. Click "Save Configuration" to apply changes

### Testing Banner Configuration
1. After saving configuration, open the main site (`https://earbomb.org`)
2. Banners should appear according to your settings
3. Use "Test Configuration" button in admin panel to open main site in new tab

### Security Notes
- Change the default admin password immediately
- Admin panel is protected by password authentication
- Admin sessions use tokens stored in localStorage (cleared on logout)
- API endpoints require valid admin tokens

## Troubleshooting

### CORS-Fehler
Stelle sicher, dass der Cloudflare Worker CORS-Header sendet. Der Code enthält bereits CORS-Header.

### Datenbank-Fehler
- Prüfe, ob die D1-Datenbank korrekt eingerichtet ist
- Führe `npm run db:init:remote` aus, um das Schema remote zu initialisieren

### Audio-Probleme
- Moderne Browser benötigen HTTPS für Audio-Aufnahme
- Stelle sicher, dass beide Domains (Frontend und API) HTTPS verwenden

### Banner nicht sichtbar
1. Prüfe ob `bannerMode` nicht auf "none" gesetzt ist
2. Stelle sicher, dass Banner-HTML korrekt ist
3. Überprüfe die Browser-Konsole auf Fehler (F12 → Console)
4. Teste die API-Endpoint direkt: `https://api.earbomb.org/api/config`

### Admin Panel Login fehlgeschlagen
1. Prüfe ob die Worker-API erreichbar ist
2. Stelle sicher, dass du das korrekte Passwort verwendest (Standard: "A123")
3. Überprüfe die Browser-Konsole auf Netzwerkfehler

## Support

Bei Problemen erstelle ein Issue im GitHub Repository oder kontaktiere den Entwickler.