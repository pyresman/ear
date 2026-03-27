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

## Troubleshooting

### CORS-Fehler
Stelle sicher, dass der Cloudflare Worker CORS-Header sendet. Der Code enthält bereits CORS-Header.

### Datenbank-Fehler
- Prüfe, ob die D1-Datenbank korrekt eingerichtet ist
- Führe `npm run db:init:remote` aus, um das Schema remote zu initialisieren

### Audio-Probleme
- Moderne Browser benötigen HTTPS für Audio-Aufnahme
- Stelle sicher, dass beide Domains (Frontend und API) HTTPS verwenden

## Support

Bei Problemen erstelle ein Issue im GitHub Repository oder kontaktiere den Entwickler.