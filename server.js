const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const messages = new Map();

function generateCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

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
        
        const host = req.get('host');
        res.json({
            success: true,
            code,
            link: `http://${host}/${code}`,
            expiresAt,
            hasPassword: !!password
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/:code', (req, res) => {
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

app.post('/:code/play', (req, res) => {
    const code = req.params.code.toUpperCase();
    const msg = messages.get(code);
    
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (Date.now() > msg.expiresAt) {
        messages.delete(code);
        return res.status(410).json({ error: 'Message expired' });
    }
    
    if (msg.accessed && msg.destroyMode === 'play') {
        messages.delete(code);
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
    
    res.json({ success: true, audio: msg.audio });
});

function cleanExpired() {
    const now = Date.now();
    for (const [code, msg] of messages) {
        if (msg.expiresAt < now) messages.delete(code);
    }
}

setInterval(cleanExpired, 60000);

app.listen(PORT, () => console.log(`EARBOMB running on http://localhost:${PORT}`));
