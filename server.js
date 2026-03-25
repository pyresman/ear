const express = require('express');
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'earbomb.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        code TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        destroy_mode TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        accessed INTEGER DEFAULT 0
    )
`);

const ENCRYPTION_KEY = crypto.scryptSync(
    process.env.SECRET_KEY || 'earbomb-secret-key-change-me-123!',
    'salt',
    32
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

function encrypt(data) {
    const key = crypto.scryptSync(data.slice(0, 32), 'enc', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return { encrypted: encrypted.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function decrypt(encrypted, iv, tag, keyData) {
    const key = crypto.scryptSync(keyData.slice(0, 32), 'enc', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString();
}

function generateCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function cleanExpired() {
    db.prepare('DELETE FROM messages WHERE expires_at < ?').run(Date.now());
}

setInterval(cleanExpired, 60000);

app.post('/api/create', (req, res) => {
    try {
        const { audio, destroyMode, destroyTime } = req.body;
        if (!audio) return res.status(400).json({ error: 'Kein Audio' });
        
        const code = generateCode();
        const now = Date.now();
        const expiresAt = now + (parseInt(destroyTime) || 3600) * 1000;
        
        const { encrypted, iv, tag } = encrypt(audio);
        
        db.prepare('INSERT INTO messages (code, encrypted_data, destroy_mode, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(code, JSON.stringify({ e: encrypted, iv, tag }), destroyMode || 'play', expiresAt, now);
        
        const host = req.get('host');
        res.json({
            success: true, code, link: `http://${host}/${code}`,
            expiresAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler' });
    }
});

app.get('/:code', (req, res) => {
    cleanExpired();
    const msg = db.prepare('SELECT * FROM messages WHERE code = ?').get(req.params.code.toUpperCase());
    
    if (!msg) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    if (Date.now() > msg.expires_at) return res.status(410).sendFile(path.join(__dirname, 'public', 'expired.html'));
    
    const isPlayMode = msg.destroy_mode === 'play' || msg.destroy_mode === 'both';
    if (isPlayMode && msg.accessed) return res.status(410).sendFile(path.join(__dirname, 'public', 'expired.html'));
    
    db.prepare('UPDATE messages SET accessed = 1 WHERE code = ?').run(msg.code);
    
    res.json({
        exists: true, createdAt: msg.created_at, expiresAt: msg.expires_at,
        destroyMode: msg.destroy_mode, remaining: Math.max(0, Math.floor((msg.expires_at - Date.now()) / 1000))
    });
});

app.post('/:code/play', (req, res) => {
    const msg = db.prepare('SELECT * FROM messages WHERE code = ?').get(req.params.code.toUpperCase());
    
    if (!msg) return res.status(404).json({ error: 'Nicht gefunden' });
    if (Date.now() > msg.expires_at || (msg.accessed && msg.destroy_mode !== 'time')) {
        return res.status(410).json({ error: 'Abgelaufen' });
    }
    
    const { e, iv, tag } = JSON.parse(msg.encrypted_data);
    const decrypted = decrypt(e, iv, tag, msg.code);
    
    if (msg.destroy_mode === 'play' || msg.destroy_mode === 'both') {
        db.prepare('DELETE FROM messages WHERE code = ?').run(msg.code);
    }
    
    res.json({ success: true, audio: decrypted });
});

app.listen(PORT, () => console.log(`💣 EARBOMB läuft auf http://localhost:${PORT}`));
