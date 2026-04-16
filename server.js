const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'earbomb-admin';

const STORE_FILE = path.join(__dirname, '.messages.json');
const BANNER_FILE = path.join(__dirname, '.banners.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

const messages = new Map();
let bannerConfig = {
    header: { enabled: false, size: 'large', imageUrl: '', imageLink: '' },
    footer: { enabled: false, size: 'large', imageUrl: '', imageLink: '' }
};
const adminSessions = new Set();

function loadMessages() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
            const now = Date.now();
            for (const [code, msg] of Object.entries(raw)) {
                if (msg.expiresAt > now) messages.set(code, msg);
            }
            console.log(`Loaded ${messages.size} active messages from disk`);
        }
    } catch (err) {
        console.error('Could not load messages:', err.message);
    }
}

function saveMessages() {
    try {
        const obj = {};
        for (const [code, msg] of messages) obj[code] = msg;
        fs.writeFileSync(STORE_FILE, JSON.stringify(obj));
    } catch (err) {
        console.error('Could not save messages:', err.message);
    }
}

function loadBanners() {
    try {
        if (fs.existsSync(BANNER_FILE)) {
            bannerConfig = JSON.parse(fs.readFileSync(BANNER_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Could not load banners:', err.message);
    }
}

function saveBanners() {
    try {
        fs.writeFileSync(BANNER_FILE, JSON.stringify(bannerConfig, null, 2));
    } catch (err) {
        console.error('Could not save banners:', err.message);
    }
}

loadMessages();
loadBanners();

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | host:${req.get('host')} | ua:${(req.get('user-agent') || '').slice(0, 40)}`);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '20mb' }));

app.get('/api/config', (req, res) => {
    res.json({
        primaryColor: '#ff6b6b',
        secondaryColor: '#ffa500',
        title: 'EARBOMB',
        subtitle: 'Self-Destructing Audio Messages',
        showDisclaimer: true,
        disclaimerText: 'By using this service, you agree that audio messages are automatically deleted after being played or after the time expires.',
        tickerText: 'Welcome to EARBOMB - Self-destructing audio messages that disappear forever!',
        tickerEnabled: true
    });
});

app.get('/api/banners', (req, res) => {
    res.json(bannerConfig);
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Falsches Passwort' });
    }
});

app.get('/api/admin/banners', adminAuth, (req, res) => {
    res.json(bannerConfig);
});

app.post('/api/admin/banners', adminAuth, (req, res) => {
    const { header, footer } = req.body;
    if (header !== undefined) bannerConfig.header = { ...bannerConfig.header, ...header };
    if (footer !== undefined) bannerConfig.footer = { ...bannerConfig.footer, ...footer };
    saveBanners();
    res.json({ success: true, bannerConfig });
});

app.post('/api/admin/banner/upload', adminAuth, (req, res) => {
    const { position, imageData, mimeType } = req.body;
    if (!imageData || !position || !['header', 'footer'].includes(position)) {
        return res.status(400).json({ error: 'Ungültige Daten' });
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/gif' ? 'gif' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${position}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    try {
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const oldUrl = bannerConfig[position].imageUrl;
        if (oldUrl && oldUrl.startsWith('/uploads/')) {
            const oldFile = path.join(__dirname, 'public', oldUrl);
            if (fs.existsSync(oldFile)) {
                try { fs.unlinkSync(oldFile); } catch (e) {}
            }
        }

        bannerConfig[position].imageUrl = `/uploads/${filename}`;
        saveBanners();
        res.json({ success: true, imageUrl: `/uploads/${filename}` });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload fehlgeschlagen' });
    }
});

app.delete('/api/admin/banner/:position', adminAuth, (req, res) => {
    const { position } = req.params;
    if (!['header', 'footer'].includes(position)) {
        return res.status(400).json({ error: 'Ungültige Position' });
    }

    const oldUrl = bannerConfig[position].imageUrl;
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, 'public', oldUrl);
        if (fs.existsSync(oldFile)) {
            try { fs.unlinkSync(oldFile); } catch (e) {}
        }
    }

    bannerConfig[position].imageUrl = '';
    saveBanners();
    res.json({ success: true });
});

app.get('/api/qr', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('url required');
    try {
        const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'H', width: 300, margin: 2 });
        res.setHeader('Content-Type', 'image/png');
        res.send(png);
    } catch (err) {
        res.status(500).send('QR error');
    }
});

app.post('/api/create', (req, res) => {
    try {
        const { audio, destroyMode, destroyTime, password } = req.body;
        if (!audio) return res.status(400).json({ error: 'No audio provided' });

        const code = generateCode();
        const now = Date.now();
        const expiresAt = now + (parseInt(destroyTime) || 3600) * 1000;

        const message = {
            audio,
            destroyMode: destroyMode || 'play',
            expiresAt,
            createdAt: now,
            accessed: false,
            password: password ? hashPassword(password) : null,
            needsPassword: !!password
        };

        messages.set(code, message);
        saveMessages();

        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.get('host');
        res.json({
            success: true,
            code,
            link: `${proto}://${host}/?code=${code}`,
            expiresAt,
            hasPassword: !!password
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/message/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const msg = messages.get(code);

    if (!msg) return res.status(404).json({ exists: false, error: 'Message not found' });
    if (Date.now() > msg.expiresAt) {
        messages.delete(code);
        return res.status(410).json({ exists: false, error: 'Message expired' });
    }

    const isPlayMode = msg.destroyMode === 'play' || msg.destroyMode === 'both';
    if (isPlayMode && msg.accessed) {
        messages.delete(code);
        return res.status(410).json({ exists: false, error: 'Message already played' });
    }

    res.json({
        exists: true,
        createdAt: msg.createdAt,
        expiresAt: msg.expiresAt,
        destroyMode: msg.destroyMode,
        needsPassword: msg.needsPassword,
        remaining: Math.max(0, Math.floor((msg.expiresAt - Date.now()) / 1000))
    });
});

app.post('/api/message/:code/play', (req, res) => {
    const code = req.params.code.toUpperCase();
    const msg = messages.get(code);

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (Date.now() > msg.expiresAt) {
        messages.delete(code);
        saveMessages();
        return res.status(410).json({ error: 'Message expired' });
    }

    if (msg.accessed && msg.destroyMode === 'play') {
        messages.delete(code);
        saveMessages();
        return res.status(410).json({ error: 'Already played' });
    }

    if (msg.needsPassword) {
        const inputHash = hashPassword(req.body.password || '');
        if (inputHash !== msg.password) {
            return res.status(401).json({ error: 'Invalid password' });
        }
    }

    msg.accessed = true;

    if (msg.destroyMode === 'play' || msg.destroyMode === 'both') {
        messages.delete(code);
    }

    saveMessages();
    res.json({ success: true, audio: msg.audio });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function cleanExpired() {
    const now = Date.now();
    let changed = false;
    for (const [code, msg] of messages) {
        if (msg.expiresAt < now) { messages.delete(code); changed = true; }
    }
    if (changed) saveMessages();
}

setInterval(cleanExpired, 60000);

app.listen(PORT, '0.0.0.0', () => console.log(`EARBOMB running on http://0.0.0.0:${PORT}`));
