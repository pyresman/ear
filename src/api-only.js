import { Hono } from 'hono';

const app = new Hono();

// Configuration for frontend
let CONFIG = {
  primaryColor: '#ff6b6b',
  secondaryColor: '#ffa500',
  title: 'EARBOMB',
  subtitle: 'Self-Destructing Audio Messages',
  showDisclaimer: true,
  disclaimerText: 'By using this service, you agree that audio messages are automatically deleted after being played or after the time expires. We do not store messages permanently.',
  tickerText: 'Welcome to EARBOMB - Self-destructing audio messages that disappear forever!',
  tickerEnabled: true,
  adTopEnabled: true,
  adBottomEnabled: true
};

let ADMIN_PASSWORD = 'A123';

// CORS middleware
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.res.headers.set('Access-Control-Max-Age', '86400');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

// Helper functions
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const random = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    code += chars[random[i] % chars.length];
  }
  return code;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashKey(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + 'earbomb-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encrypt(data, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)), { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, encoder.encode(data));
  return { data: btoa(String.fromCharCode(...new Uint8Array(encrypted))), iv: btoa(String.fromCharCode(...iv)) };
}

async function decrypt(encryptedData, ivStr, key) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)), { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data);
  return new TextDecoder().decode(decrypted);
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

const adminTokens = new Set();

// Config endpoint for frontend
app.get('/api/config', async (c) => {
  return c.json(CONFIG);
});

// Admin API
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json();
  if (password === ADMIN_PASSWORD) {
    const token = generateToken();
    adminTokens.add(token);
    return c.json({ success: true, token });
  }
  return c.json({ success: false }, 401);
});

app.post('/api/admin/change-password', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const { newPassword } = await c.req.json();
  if (newPassword && newPassword.length >= 4) {
    ADMIN_PASSWORD = newPassword;
    return c.json({ success: true });
  }
  return c.json({ success: false }, 400);
});

app.post('/api/admin/config', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const newConfig = await c.req.json();
  CONFIG = { ...CONFIG, ...newConfig };
  return c.json({ success: true });
});

app.get('/api/admin/messages', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const messages = await c.env.DB.prepare('SELECT code, created_at, expires_at, destroy_mode, needs_password FROM messages ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ messages: messages.results || [] });
});

app.delete('/api/admin/delete/:code', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const code = c.req.param('code');
  await c.env.DB.prepare('DELETE FROM messages WHERE code = ?').bind(code).run();
  return c.json({ success: true });
});

// Message API
app.post('/api/create', async (c) => {
  try {
    const { audio, destroyMode, destroyTime, password } = await c.req.json();
    if (!audio) return c.json({ error: 'No audio provided' }, 400);
    const code = generateCode();
    const encryptionKey = await hashKey(code);
    const encrypted = await encrypt(audio, encryptionKey);
    const now = Date.now() / 1000;
    const expiresIn = parseInt(destroyTime) || 3600;
    const expiresAt = Math.floor(now + expiresIn);
    let hashedPassword = null;
    if (password) hashedPassword = await hashPassword(password);
    await c.env.DB.prepare(`INSERT INTO messages (code, encrypted_data, iv, destroy_mode, expires_at, created_at, password_hash, needs_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(code, encrypted.data, encrypted.iv, destroyMode || 'play', expiresAt, Math.floor(now), hashedPassword, password ? 1 : 0).run();
    const url = new URL(c.req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    return c.json({ success: true, code, link: `${baseUrl}/${code}`, expiresAt: expiresAt * 1000, hasPassword: !!password });
  } catch (err) {
    console.error(err);
    return c.json({ error: 'Server error' }, 500);
  }
});

app.get('/:code{[A-Z0-9]{6}}', async (c) => {
  const code = c.req.param('code').toUpperCase();
  const msg = await c.env.DB.prepare('SELECT * FROM messages WHERE code = ?').bind(code).first();
  if (!msg) return c.json({ exists: false }, 404);
  const now = Math.floor(Date.now() / 1000);
  if (now > msg.expires_at) return c.json({ exists: false, reason: 'expired' }, 410);
  if ((msg.destroy_mode === 'play' || msg.destroy_mode === 'both') && msg.accessed) return c.json({ exists: false, reason: 'destroyed' }, 410);
  return c.json({ exists: true, destroyMode: msg.destroy_mode, needsPassword: !!msg.needs_password, remaining: Math.max(0, msg.expires_at - now), expiresAt: msg.expires_at * 1000 });
});

app.post('/:code{[A-Z0-9]{6}}/play', async (c) => {
  const code = c.req.param('code').toUpperCase();
  const { password } = await c.req.json();
  const msg = await c.env.DB.prepare('SELECT * FROM messages WHERE code = ?').bind(code).first();
  if (!msg) return c.json({ error: 'Message not found' }, 404);
  const now = Math.floor(Date.now() / 1000);
  if (now > msg.expires_at) { await c.env.DB.prepare('DELETE FROM messages WHERE code = ?').bind(code).run(); return c.json({ error: 'Message expired' }, 410); }
  if (msg.accessed && msg.destroy_mode === 'play') { await c.env.DB.prepare('DELETE FROM messages WHERE code = ?').bind(code).run(); return c.json({ error: 'Already played' }, 410); }
  if (msg.needs_password && msg.password_hash) { const inputHash = await hashPassword(password || ''); if (inputHash !== msg.password_hash) return c.json({ error: 'Invalid password' }, 401); }
  const encryptionKey = await hashKey(code);
  let decrypted;
  try { decrypted = await decrypt(msg.encrypted_data, msg.iv, encryptionKey); } catch (e) { return c.json({ error: 'Decryption error' }, 500); }
  if (msg.destroy_mode === 'play' || msg.destroy_mode === 'both') { await c.env.DB.prepare('DELETE FROM messages WHERE code = ?').bind(code).run(); } else { await c.env.DB.prepare('UPDATE messages SET accessed = 1 WHERE code = ?').bind(code).run(); }
  return c.json({ success: true, audio: decrypted });
});

// 404 handler
app.notFound(async (c) => {
  return c.json({ error: 'Not found', message: 'API endpoint does not exist' }, 404);
});

export default app;