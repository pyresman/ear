import { Hono } from 'hono';

const app = new Hono();

let ADMIN_PASSWORD = 'A123';
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

const META_HTML = `
    <title>${CONFIG.title} - ${CONFIG.subtitle}</title>
    <meta name="description" content="Send self-destructing audio messages that disappear after being played. Free, secure, and private. No account needed.">
    <meta name="keywords" content="audio messages, self-destruct, temporary audio, private messages, secure audio, ephemeral messages, earbomb">
    <meta name="robots" content="index, follow">
    <meta property="og:title" content="${CONFIG.title} - ${CONFIG.subtitle}">
    <meta property="og:description" content="Send self-destructing audio messages that disappear after being played.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://earbomb.org">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${CONFIG.title} - ${CONFIG.subtitle}">
    <meta name="twitter:description" content="Send self-destructing audio messages that disappear after being played.">
    <link rel="canonical" href="https://earbomb.org">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💣</text></svg>">`;

const TICKER_HTML = `<div class="ticker-wrap" id="tickerWrap"><div class="ticker"><span class="ticker-item" id="tickerText">${CONFIG.tickerText}</span></div></div>`;

const DISCLAIMER_HTML = `<div class="disclaimer-overlay" id="disclaimerOverlay"><div class="disclaimer-modal"><h2>Important Notice</h2><p id="disclaimerText">${CONFIG.disclaimerText}</p><label><input type="checkbox" id="acceptDisclaimer"> I understand and agree</label><button id="acceptBtn" disabled>Continue</button></div></div>`;

const ADMIN_HTML = (currentConfig) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EARBOMB Admin</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #ff6b6b; margin-bottom: 30px; }
        h2 { color: #fff; margin: 20px 0 10px; font-size: 1.2em; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; text-align: center; }
        .stat-value { font-size: 2.5em; font-weight: bold; color: #ff6b6b; }
        .stat-label { color: #888; margin-top: 5px; }
        .login-form { max-width: 400px; margin: 100px auto; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; }
        .login-form input { width: 100%; padding: 15px; margin: 10px 0; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-size: 1em; }
        .login-form button { width: 100%; padding: 15px; background: linear-gradient(135deg, #ff6b6b, #ffa500); border: none; border-radius: 10px; color: #fff; font-size: 1.1em; cursor: pointer; margin-top: 10px; }
        .config-section { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; margin-bottom: 20px; }
        .config-row { display: flex; align-items: center; margin: 15px 0; gap: 15px; }
        .config-row label { min-width: 150px; color: #888; }
        .config-row input[type="text"], .config-row textarea { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; }
        .config-row textarea { min-height: 80px; resize: vertical; }
        .config-row input[type="color"] { width: 50px; height: 35px; border: none; cursor: pointer; }
        .config-row input[type="checkbox"] { width: 20px; height: 20px; }
        .config-row input[type="password"] { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; }
        .btn { padding: 12px 24px; border: none; border-radius: 10px; cursor: pointer; font-size: 1em; }
        .btn-primary { background: linear-gradient(135deg, #ff6b6b, #ffa500); color: #fff; }
        .btn-danger { background: #ff4444; color: #fff; }
        .btn-success { background: #4CAF50; color: #fff; }
        table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; margin-top: 20px; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { background: rgba(255,107,107,0.2); color: #ff6b6b; }
        tr:hover { background: rgba(255,255,255,0.05); }
        .logout-btn { background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; margin-bottom: 20px; }
        .filter-group { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-btn { padding: 10px 20px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #fff; border-radius: 10px; cursor: pointer; }
        .filter-btn.active { background: linear-gradient(135deg, #ff6b6b, #ffa500); border-color: transparent; }
        .preview-btn { background: #667eea; color: #fff; margin-left: 10px; }
        .toast { position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.95); color: #fff; padding: 15px 25px; border-radius: 10px; opacity: 0; transition: opacity 0.3s; z-index: 1000; }
        .toast.show { opacity: 1; }
        .toast.success { border-left: 4px solid #4CAF50; }
        .toast.error { border-left: 4px solid #ff4444; }
    </style>
</head>
<body>
    <div class="container">
        <div id="loginSection" class="login-form">
            <h1 style="text-align:center;">EARBOMB Admin</h1>
            <input type="password" id="passwordInput" placeholder="Enter password">
            <button onclick="login()">Login</button>
        </div>
        <div id="adminSection" style="display:none;">
            <button class="logout-btn" onclick="logout()">Logout</button>
            
            <div class="config-section">
                <h1>Settings</h1>
                
                <h2>Password</h2>
                <div class="config-row">
                    <label>New Password:</label>
                    <input type="password" id="newPassword" placeholder="Enter new password">
                    <button class="btn btn-primary" onclick="changePassword()">Change Password</button>
                </div>
                
                <h2>Design Colors</h2>
                <div class="config-row">
                    <label>Primary Color:</label>
                    <input type="color" id="primaryColor" value="${currentConfig.primaryColor}">
                    <input type="text" id="primaryColorText" value="${currentConfig.primaryColor}" style="width:120px;">
                </div>
                <div class="config-row">
                    <label>Secondary Color:</label>
                    <input type="color" id="secondaryColor" value="${currentConfig.secondaryColor}">
                    <input type="text" id="secondaryColorText" value="${currentConfig.secondaryColor}" style="width:120px;">
                </div>
                
                <h2>Texts</h2>
                <div class="config-row">
                    <label>Title:</label>
                    <input type="text" id="titleText" value="${currentConfig.title}">
                </div>
                <div class="config-row">
                    <label>Subtitle:</label>
                    <input type="text" id="subtitleText" value="${currentConfig.subtitle}">
                </div>
                
                <h2>Disclaimer</h2>
                <div class="config-row">
                    <label>Show Disclaimer:</label>
                    <input type="checkbox" id="showDisclaimer" ${currentConfig.showDisclaimer ? 'checked' : ''}>
                </div>
                <div class="config-row">
                    <label>Disclaimer Text:</label>
                    <textarea id="disclaimerText">${currentConfig.disclaimerText}</textarea>
                </div>
                
                <h2>Ticker</h2>
                <div class="config-row">
                    <label>Enable Ticker:</label>
                    <input type="checkbox" id="tickerEnabled" ${currentConfig.tickerEnabled ? 'checked' : ''}>
                </div>
                <div class="config-row">
                    <label>Ticker Text:</label>
                    <input type="text" id="tickerText" value="${currentConfig.tickerText}">
                </div>
                
                <h2>Ads</h2>
                <div class="config-row">
                    <label>Show Top Ad:</label>
                    <input type="checkbox" id="adTopEnabled" ${currentConfig.adTopEnabled ? 'checked' : ''}>
                </div>
                <div class="config-row">
                    <label>Show Bottom Ad:</label>
                    <input type="checkbox" id="adBottomEnabled" ${currentConfig.adBottomEnabled ? 'checked' : ''}>
                </div>
                
                <div style="margin-top:20px;">
                    <button class="btn btn-success" onclick="saveConfig()">Save All Changes</button>
                    <button class="btn preview-btn" onclick="previewApp()">Preview App</button>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card"><div class="stat-value" id="totalMessages">0</div><div class="stat-label">Total Messages</div></div>
                <div class="stat-card"><div class="stat-value" id="activeMessages">0</div><div class="stat-label">Active</div></div>
                <div class="stat-card"><div class="stat-value" id="expiredMessages">0</div><div class="stat-label">Expired</div></div>
                <div class="stat-card"><div class="stat-value" id="passwordProtected">0</div><div class="stat-label">Password Protected</div></div>
            </div>
            
            <div class="filter-group">
                <button class="filter-btn active" onclick="filterAll()">All</button>
                <button class="filter-btn" onclick="filterActive()">Active</button>
                <button class="filter-btn" onclick="filterExpired()">Expired</button>
                <button class="filter-btn" onclick="filterProtected()">Password Protected</button>
            </div>
            
            <table>
                <thead><tr><th>Code</th><th>Created</th><th>Expires</th><th>Destroy Mode</th><th>Password</th><th>Actions</th></tr></thead>
                <tbody id="messagesTable"></tbody>
            </table>
        </div>
    </div>
    <div class="toast" id="toast"></div>
    
    <script>
        let allMessages = [];
        let currentFilter = 'all';
        
        document.getElementById('primaryColor').addEventListener('input', (e) => document.getElementById('primaryColorText').value = e.target.value);
        document.getElementById('secondaryColor').addEventListener('input', (e) => document.getElementById('secondaryColorText').value = e.target.value);
        document.getElementById('primaryColorText').addEventListener('input', (e) => document.getElementById('primaryColor').value = e.target.value);
        document.getElementById('secondaryColorText').addEventListener('input', (e) => document.getElementById('secondaryColor').value = e.target.value);
        
        async function login() {
            const password = document.getElementById('passwordInput').value;
            const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
            const data = await res.json();
            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('adminSection').style.display = 'block';
                loadMessages();
            } else {
                showToast('Invalid password', 'error');
            }
        }
        
        function logout() {
            sessionStorage.removeItem('adminToken');
            location.reload();
        }
        
        async function loadMessages() {
            const token = sessionStorage.getItem('adminToken');
            if (!token) return;
            const res = await fetch('/api/admin/messages', { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            allMessages = data.messages || [];
            updateStats();
            renderMessages();
        }
        
        function updateStats() {
            const now = Date.now() / 1000;
            const total = allMessages.length;
            const active = allMessages.filter(m => m.expires_at > now).length;
            const expired = total - active;
            const protected_ = allMessages.filter(m => m.needs_password).length;
            document.getElementById('totalMessages').textContent = total;
            document.getElementById('activeMessages').textContent = active;
            document.getElementById('expiredMessages').textContent = expired;
            document.getElementById('passwordProtected').textContent = protected_;
        }
        
        function renderMessages() {
            const now = Date.now() / 1000;
            let filtered = allMessages;
            if (currentFilter === 'active') filtered = allMessages.filter(m => m.expires_at > now);
            else if (currentFilter === 'expired') filtered = allMessages.filter(m => m.expires_at <= now);
            else if (currentFilter === 'protected') filtered = allMessages.filter(m => m.needs_password);
            
            const tbody = document.getElementById('messagesTable');
            tbody.innerHTML = filtered.map(m => {
                const created = new Date(m.created_at * 1000).toLocaleString();
                const expires = new Date(m.expires_at * 1000).toLocaleString();
                const isExpired = m.expires_at <= now;
                return '<tr><td>' + m.code + '</td><td>' + created + '</td><td style="color:' + (isExpired ? '#ff4444' : '#4CAF50') + '">' + expires + '</td><td>' + m.destroy_mode + '</td><td>' + (m.needs_password ? 'Yes' : 'No') + '</td><td><button class="btn btn-danger" onclick="deleteMessage(\\'' + m.code + '\\')">Delete</button></td></tr>';
            }).join('');
        }
        
        function filterAll() { currentFilter = 'all'; updateFilterBtns(); renderMessages(); }
        function filterActive() { currentFilter = 'active'; updateFilterBtns(); renderMessages(); }
        function filterExpired() { currentFilter = 'expired'; updateFilterBtns(); renderMessages(); }
        function filterProtected() { currentFilter = 'protected'; updateFilterBtns(); renderMessages(); }
        
        function updateFilterBtns() {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event?.target?.classList?.add('active');
        }
        
        async function deleteMessage(code) {
            if (!confirm('Delete this message?')) return;
            const token = sessionStorage.getItem('adminToken');
            await fetch('/api/admin/delete/' + code, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
            loadMessages();
            showToast('Message deleted', 'success');
        }
        
        async function changePassword() {
            const newPass = document.getElementById('newPassword').value;
            if (!newPass) { showToast('Enter a new password', 'error'); return; }
            const token = sessionStorage.getItem('adminToken');
            const res = await fetch('/api/admin/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ newPassword: newPass }) });
            const data = await res.json();
            if (data.success) {
                showToast('Password changed successfully', 'success');
                document.getElementById('newPassword').value = '';
            } else {
                showToast('Failed to change password', 'error');
            }
        }
        
        async function saveConfig() {
            const token = sessionStorage.getItem('adminToken');
            const config = {
                primaryColor: document.getElementById('primaryColorText').value,
                secondaryColor: document.getElementById('secondaryColorText').value,
                title: document.getElementById('titleText').value,
                subtitle: document.getElementById('subtitleText').value,
                showDisclaimer: document.getElementById('showDisclaimer').checked,
                disclaimerText: document.getElementById('disclaimerText').value,
                tickerEnabled: document.getElementById('tickerEnabled').checked,
                tickerText: document.getElementById('tickerText').value,
                adTopEnabled: document.getElementById('adTopEnabled').checked,
                adBottomEnabled: document.getElementById('adBottomEnabled').checked
            };
            const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(config) });
            const data = await res.json();
            if (data.success) {
                showToast('Configuration saved!', 'success');
            } else {
                showToast('Failed to save config', 'error');
            }
        }
        
        function previewApp() {
            window.open('/', '_blank');
        }
        
        function showToast(msg, type) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast show ' + type;
            setTimeout(() => t.classList.remove('show'), 3000);
        }
        
        if (sessionStorage.getItem('adminToken')) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            loadMessages();
        }
        
        document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    </script>
</body>
</html>`;

function generateIndexHTML() {
    const gradient = `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">` + META_HTML + `
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #0f0f1a, #1a1a2e); min-height: 100vh; display: flex; flex-direction: column; color: #fff; }
        .ad-banner { width: 100%; max-width: 728px; margin: 10px auto; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 10px; display: ${CONFIG.adTopEnabled ? 'block' : 'none'}; }
        .ad-placeholder { text-align: center; min-height: 90px; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; }
        .ticker-wrap { width: 100%; overflow: hidden; background: rgba(0,0,0,0.5); padding: 10px 0; display: ${CONFIG.tickerEnabled ? 'block' : 'none'}; }
        .ticker { display: inline-block; white-space: nowrap; animation: ticker 30s linear infinite; }
        .ticker-item { font-size: 0.9em; color: ${CONFIG.primaryColor}; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .main-content { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border-radius: 24px; padding: 40px; max-width: 520px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 80px rgba(0,0,0,0.6); }
        h1 { text-align: center; font-size: 2.5em; background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
        .tabs { display: flex; gap: 8px; margin-bottom: 25px; }
        .tab { flex: 1; padding: 14px; border: none; background: rgba(0,0,0,0.3); color: rgba(255,255,255,0.7); border-radius: 10px; cursor: pointer; font-size: 1em; transition: all 0.3s; }
        .tab.active { background: ${gradient}; color: #fff; }
        .section { display: none; }
        .section.active { display: block; }
        .record-area { text-align: center; padding: 30px 0; }
        .record-btn { width: 140px; height: 140px; border-radius: 50%; border: 4px solid transparent; background: conic-gradient(${CONFIG.primaryColor}, ${CONFIG.secondaryColor}, ${CONFIG.primaryColor}); cursor: pointer; margin: 0 auto 20px; display: block; position: relative; transition: all 0.3s; }
        .record-btn::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; border-radius: 50%; background: #1a1a2e; }
        .record-btn::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; background: ${CONFIG.primaryColor}; }
        .record-btn.recording::before { width: 40px; height: 40px; border-radius: 8px; }
        .record-btn.recording::after { display: none; }
        .record-btn.recording { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 30px ${CONFIG.primaryColor}80; } 50% { box-shadow: 0 0 60px ${CONFIG.primaryColor}cc; } }
        .timer { font-size: 2.5em; font-family: monospace; margin: 15px 0; letter-spacing: 4px; }
        .status { color: #888; font-size: 0.9em; }
        .status.recording { color: ${CONFIG.primaryColor}; animation: blink 1s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .options { background: rgba(0,0,0,0.3); border-radius: 16px; padding: 20px; margin: 20px 0; }
        .option-group { margin-bottom: 15px; }
        .option-group:last-child { margin-bottom: 0; }
        .option-label { display: block; margin-bottom: 8px; color: #888; font-size: 0.9em; }
        input[type="password"], input[type="text"] { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-size: 1em; }
        select { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-size: 1em; }
        .checkbox-group { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .checkbox-group input[type="checkbox"] { width: 20px; height: 20px; accent-color: ${CONFIG.primaryColor}; }
        .checkbox-group label { color: #aaa; cursor: pointer; }
        .btn { width: 100%; padding: 16px; border: none; border-radius: 12px; font-size: 1.1em; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 15px; }
        .btn-primary { background: ${gradient}; color: #fff; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px ${CONFIG.primaryColor}66; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
        .result { display: none; text-align: center; animation: fadeIn 0.4s; }
        .result.show { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } }
        .code-display { font-size: 3em; font-family: monospace; letter-spacing: 8px; color: ${CONFIG.primaryColor}; background: rgba(0,0,0,0.4); padding: 20px; border-radius: 12px; margin: 20px 0; }
        .link-display { background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; font-family: monospace; font-size: 0.85em; word-break: break-all; margin: 15px 0; color: #aaa; }
        .password-display { background: ${CONFIG.primaryColor}33; padding: 15px; border-radius: 10px; font-family: monospace; margin: 15px 0; border: 1px solid ${CONFIG.primaryColor}66; }
        .qr-section { text-align: center; margin: 20px 0; }
        .qr-container { background: #fff; border-radius: 16px; padding: 20px; display: inline-block; }
        #qrCanvas { display: block; }
        .share-options { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; justify-content: center; }
        .share-btn { flex: 1; min-width: 120px; padding: 12px 16px; border: none; border-radius: 10px; font-size: 0.9em; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.telegram { background: #0088cc; color: #fff; }
        .share-btn.clipboard { background: rgba(255,255,255,0.1); color: #fff; }
        .share-btn.native { background: ${gradient}; color: #fff; }
        .share-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .btn-group { display: flex; gap: 10px; }
        .btn-group .btn { margin-top: 0; flex: 1; }
        .input-group { margin-bottom: 20px; }
        .code-input { width: 100%; padding: 20px; text-align: center; font-size: 1.5em; font-family: monospace; letter-spacing: 8px; text-transform: uppercase; border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; }
        .code-input::placeholder { color: #666; letter-spacing: 4px; }
        .code-input:focus { outline: none; border-color: ${CONFIG.primaryColor}; }
        .player { display: none; text-align: center; padding: 30px 0; }
        .player.show { display: block; }
        .bomb-icon { font-size: 5em; animation: float 2s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .countdown { font-size: 2em; color: ${CONFIG.primaryColor}; margin: 20px 0; }
        .visualizer { height: 80px; background: rgba(0,0,0,0.4); border-radius: 12px; margin: 20px 0; }
        .destroy-btn { background: linear-gradient(135deg, #ff4444, #ff0000); }
        .explosion { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, #ffff00, ${CONFIG.secondaryColor}, #ff0000); display: none; z-index: 9999; animation: explode 1.5s forwards; }
        @keyframes explode { 0% { opacity: 0; transform: scale(0); } 20% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0; transform: scale(3); } }
        .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(100px); background: rgba(0,0,0,0.95); color: #fff; padding: 15px 30px; border-radius: 12px; opacity: 0; transition: all 0.3s; z-index: 10001; }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        .toast.success { border: 1px solid rgba(0,255,136,0.5); }
        .toast.error { border: 1px solid ${CONFIG.primaryColor}66; }
        .direct-link-section { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
        .direct-link-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; padding: 12px 20px; border: none; border-radius: 10px; cursor: pointer; font-size: 0.95em; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s; }
        .direct-link-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(102,126,234,0.4); }
        .admin-link { position: fixed; bottom: 10px; right: 10px; font-size: 12px; color: #444; }
        .admin-link a { color: #444; text-decoration: none; }
        footer { text-align: center; padding: 20px; color: #666; font-size: 0.85em; }
        
        .disclaimer-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; justify-content: center; align-items: center; z-index: 10000; }
        .disclaimer-overlay.hidden { display: none; }
        .disclaimer-modal { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; max-width: 500px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .disclaimer-modal h2 { color: ${CONFIG.primaryColor}; margin-bottom: 20px; }
        .disclaimer-modal p { color: #aaa; line-height: 1.6; margin-bottom: 20px; }
        .disclaimer-modal label { display: flex; align-items: center; justify-content: center; gap: 10px; color: #888; margin-bottom: 20px; cursor: pointer; }
        .disclaimer-modal button { padding: 15px 40px; background: ${gradient}; border: none; border-radius: 10px; color: #fff; font-size: 1.1em; cursor: pointer; }
        .disclaimer-modal button:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    ${CONFIG.tickerEnabled ? `<div class="ticker-wrap"><div class="ticker"><span class="ticker-item">${CONFIG.tickerText} &nbsp;&nbsp;&nbsp; ${CONFIG.tickerText} &nbsp;&nbsp;&nbsp;</span></div></div>` : ''}
    ${CONFIG.adTopEnabled ? `<div class="ad-banner"><div class="ad-placeholder"><span>Advertisement Space - Top</span></div></div>` : ''}
    
    <div class="main-content">
        <div class="container">
            <h1>${CONFIG.title}</h1>
            <p class="subtitle">${CONFIG.subtitle}</p>
            <div class="tabs">
                <button class="tab active" data-tab="create">Record</button>
                <button class="tab" data-tab="receive">Receive</button>
            </div>
            <div id="createSection" class="section active">
                <div class="record-area">
                    <button class="record-btn" id="recordBtn"></button>
                    <div class="timer" id="timer">00:00</div>
                    <p class="status" id="status">Click to record</p>
                </div>
                <div class="options">
                    <div class="option-group">
                        <label class="option-label">Destroy after:</label>
                        <select id="destroyMode">
                            <option value="play">Playing</option>
                            <option value="time">Time expires</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <div class="option-group" id="timeGroup" style="display:none;">
                        <label class="option-label">Valid for:</label>
                        <select id="destroyTime">
                            <option value="60">1 minute</option>
                            <option value="300">5 minutes</option>
                            <option value="3600" selected>1 hour</option>
                            <option value="86400">24 hours</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="usePassword">
                            <label for="usePassword">Protect with password</label>
                        </div>
                    </div>
                    <div class="option-group" id="passwordGroup" style="display:none;">
                        <label class="option-label">Password:</label>
                        <input type="password" id="passwordInput" placeholder="Enter password">
                    </div>
                </div>
                <button class="btn btn-primary" id="sendBtn" disabled>Generate Code</button>
                <div class="result" id="result">
                    <div class="code-display" id="codeDisplay">------</div>
                    <div class="link-display" id="linkDisplay"></div>
                    <div class="password-display" id="passwordDisplay" style="display:none;">
                        <strong>Password:</strong> <span id="passwordText"></span>
                    </div>
                    <div class="qr-section">
                        <div class="qr-container">
                            <canvas id="qrCanvas" width="200" height="200"></canvas>
                        </div>
                    </div>
                    <div class="share-options" id="shareOptions" style="display:none;">
                        <button class="share-btn native" id="nativeShareBtn" style="display:none;"><span>Share</span></button>
                        <button class="share-btn whatsapp" id="whatsappBtn">WhatsApp</button>
                        <button class="share-btn telegram" id="telegramBtn">Telegram</button>
                        <button class="share-btn clipboard" id="copyLinkBtn">Copy Link</button>
                    </div>
                    <div class="direct-link-section">
                        <button class="direct-link-btn" id="openLinkBtn">Open Listen Link</button>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-primary" id="copyBtn">Copy All</button>
                        <button class="btn btn-secondary" id="newBtn">New</button>
                    </div>
                </div>
            </div>
            <div id="receiveSection" class="section">
                <div class="input-group">
                    <input type="text" class="code-input" id="codeInput" placeholder="ENTER CODE" maxlength="8" autocomplete="off">
                </div>
                <div class="input-group" id="receivePasswordGroup" style="display:none;">
                    <input type="password" id="receivePassword" placeholder="Enter password">
                </div>
                <button class="btn btn-primary" id="loadBtn">Unlock</button>
                <div class="player" id="player">
                    <div class="bomb-icon"></div>
                    <div class="countdown" id="countdown">0:00</div>
                    <canvas class="visualizer" id="visualizer"></canvas>
                    <button class="btn destroy-btn" id="destroyBtn">Destroy Now</button>
                </div>
            </div>
        </div>
    </div>
    
    ${CONFIG.adBottomEnabled ? `<div class="ad-banner"><div class="ad-placeholder"><span>Advertisement Space - Bottom</span></div></div>` : ''}
    
    <footer>${CONFIG.title} - ${CONFIG.subtitle}</footer>
    <div class="admin-link"><a href="/admin">Admin</a></div>
    <div class="explosion" id="explosion"></div>
    <div class="toast" id="toast"></div>
    ${CONFIG.showDisclaimer ? `<div class="disclaimer-overlay" id="disclaimerOverlay"><div class="disclaimer-modal"><h2>Important Notice</h2><p>${CONFIG.disclaimerText}</p><label><input type="checkbox" id="acceptDisclaimer"> I understand and agree</label><button id="acceptBtn" disabled>Continue</button></div></div>` : ''}
    
    <script>
        let mediaRecorder, audioChunks = [], audioBlob = null, isRecording = false;
        let timerInterval, seconds = 0, currentCode = null, currentPassword = null, currentLink = null, audioElement = null;
        
        const recordBtn = document.getElementById('recordBtn');
        const timer = document.getElementById('timer');
        const status = document.getElementById('status');
        const sendBtn = document.getElementById('sendBtn');
        const result = document.getElementById('result');
        const codeDisplay = document.getElementById('codeDisplay');
        const linkDisplay = document.getElementById('linkDisplay');
        const destroyMode = document.getElementById('destroyMode');
        const timeGroup = document.getElementById('timeGroup');
        const usePassword = document.getElementById('usePassword');
        const passwordGroup = document.getElementById('passwordGroup');
        const passwordInput = document.getElementById('passwordInput');
        
        const disclaimerOverlay = document.getElementById('disclaimerOverlay');
        const acceptDisclaimer = document.getElementById('acceptDisclaimer');
        const acceptBtn = document.getElementById('acceptBtn');
        
        if (disclaimerOverlay) {
            acceptDisclaimer.addEventListener('change', () => { acceptBtn.disabled = !acceptDisclaimer.checked; });
            acceptBtn.addEventListener('click', () => { disclaimerOverlay.classList.add('hidden'); localStorage.setItem('disclaimerAccepted', 'true'); });
            if (localStorage.getItem('disclaimerAccepted') === 'true') disclaimerOverlay.classList.add('hidden');
        }
        
        document.querySelectorAll('.tab').forEach(tab => { tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); tab.classList.add('active'); document.getElementById(tab.dataset.tab + 'Section').classList.add('active'); }); });
        destroyMode.addEventListener('change', () => { timeGroup.style.display = destroyMode.value !== 'play' ? 'block' : 'none'; });
        usePassword.addEventListener('change', () => { passwordGroup.style.display = usePassword.checked ? 'block' : 'none'; });
        recordBtn.addEventListener('click', () => isRecording ? stopRecording() : startRecording());
        async function startRecording() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = []; mediaRecorder.ondataavailable = e => audioChunks.push(e.data); mediaRecorder.onstop = () => { audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); sendBtn.disabled = false; stream.getTracks().forEach(t => t.stop()); }; mediaRecorder.start(); isRecording = true; recordBtn.classList.add('recording'); status.textContent = 'RECORDING'; status.classList.add('recording'); seconds = 0; timerInterval = setInterval(() => { seconds++; const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); timer.textContent = m + ':' + s; }, 1000); } catch (err) { toast('Microphone access denied', 'error'); } }
        function stopRecording() { mediaRecorder.stop(); isRecording = false; recordBtn.classList.remove('recording'); status.textContent = 'Recording stopped'; status.classList.remove('recording'); clearInterval(timerInterval); }
        sendBtn.addEventListener('click', async () => { if (!audioBlob) return; sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; try { const reader = new FileReader(); reader.onload = async () => { const base64 = reader.result.split(',')[1]; const payload = { audio: base64, destroyMode: destroyMode.value, destroyTime: document.getElementById('destroyTime').value }; if (usePassword.checked && passwordInput.value) payload.password = passwordInput.value; const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.success) { currentCode = data.code; currentPassword = usePassword.checked ? passwordInput.value : null; currentLink = data.link; codeDisplay.textContent = data.code; linkDisplay.textContent = data.link; result.classList.add('show'); sendBtn.style.display = 'none'; if (data.hasPassword) { document.getElementById('passwordDisplay').style.display = 'block'; document.getElementById('passwordText').textContent = currentPassword; } else { document.getElementById('passwordDisplay').style.display = 'none'; } generateQRCode(data.link); setupShareButtons(data.code, data.link, currentPassword); if (navigator.share) document.getElementById('nativeShareBtn').style.display = 'flex'; } else { toast(data.error || 'Error', 'error'); } }; reader.readAsDataURL(audioBlob); } catch (err) { toast('Connection error', 'error'); } sendBtn.disabled = false; sendBtn.textContent = 'Generate Code'; });
        function generateQRCode(text) { const canvas = document.getElementById('qrCanvas'); const ctx = canvas.getContext('2d'); const size = 200; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); const qr = generateQRMatrix(text, 4); const moduleCount = qr.length; const moduleSize = size / moduleCount; ctx.fillStyle = '#000000'; for (let row = 0; row < moduleCount; row++) { for (let col = 0; col < moduleCount; col++) { if (qr[row][col]) ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize); } } }
        function generateQRMatrix(text, errorLevel) { const data = textToBytes(text); const version = getQRVersion(data.length + text.length); const moduleCount = version * 4 + 17; const matrix = Array(moduleCount).fill(null).map(() => Array(moduleCount).fill(null)); addFinderPatterns(matrix, moduleCount); addTimingPatterns(matrix, moduleCount); const mask = createMaskedData(matrix, data, moduleCount, version, errorLevel); for (let row = 0; row < moduleCount; row++) { for (let col = 0; col < moduleCount; col++) { if (mask[row][col] === null) mask[row][col] = false; } } return mask; }
        function textToBytes(text) { const bytes = []; for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i)); return bytes; }
        function getQRVersion(dataLength) { const capacities = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858]; for (let v = 0; v < capacities.length; v++) { if (dataLength <= capacities[v]) return v + 1; } return 40; }
        function addFinderPatterns(matrix, size) { const positions = [[0, 0], [size - 7, 0], [0, size - 7]]; positions.forEach(([startRow, startCol]) => { for (let r = 0; r < 7; r++) { for (let c = 0; c < 7; c++) { const isEdge = r === 0 || r === 6 || c === 0 || c === 6; const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4; matrix[startRow + r][startCol + c] = isEdge || isInner; } } for (let r = 1; r < 6; r++) { matrix[startRow + r][startCol + 7] = true; matrix[startRow + 7][startCol + r] = true; } }); }
        function addTimingPatterns(matrix, size) { for (let i = 8; i < size - 8; i++) { matrix[6][i] = i % 2 === 0; matrix[i][6] = i % 2 === 0; } }
        function createMaskedData(matrix, data, size, version, errorLevel) { let dataIndex = 0; for (let col = size - 1; col > 0; col -= 2) { if (col === 6) col = 5; for (let row = 0; row < size; row++) { for (let c = 0; c < 2; c++) { const actualCol = col - c; if (matrix[row][actualCol] === null && dataIndex < data.length * 8) { const byteIndex = Math.floor(dataIndex / 8); const bitIndex = 7 - (dataIndex % 8); const bit = (data[byteIndex % data.length] >> bitIndex) & 1; matrix[row][actualCol] = bit === 1; dataIndex++; } } } } return matrix; }
        function setupShareButtons(code, link, password) { const shareText = password ? 'Listen to this EARBOMB message!\\n\\nCode: ' + code + '\\nLink: ' + link + '\\nPassword: ' + password : 'Listen to this EARBOMB message!\\n\\nCode: ' + code + '\\nLink: ' + link; document.getElementById('nativeShareBtn').onclick = async () => { try { await navigator.share({ title: 'EARBOMB Message', text: shareText, url: link }); } catch (err) { if (err.name !== 'AbortError') toast('Share failed', 'error'); } }; document.getElementById('whatsappBtn').onclick = () => { window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank'); }; document.getElementById('telegramBtn').onclick = () => { window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('EARBOMB Message: ' + code), '_blank'); }; document.getElementById('copyLinkBtn').onclick = () => { navigator.clipboard.writeText(link); toast('Link copied!', 'success'); }; document.getElementById('openLinkBtn').onclick = () => { window.open(link, '_blank'); }; }
        document.getElementById('copyBtn').addEventListener('click', () => { let text = 'Code: ' + currentCode + '\\nLink: ' + currentLink; if (currentPassword) text += '\\nPassword: ' + currentPassword; navigator.clipboard.writeText(text); toast('Copied!', 'success'); });
        document.getElementById('newBtn').addEventListener('click', () => { result.classList.remove('show'); sendBtn.style.display = 'block'; sendBtn.disabled = true; audioBlob = null; timer.textContent = '00:00'; status.textContent = 'Click to record'; usePassword.checked = false; passwordGroup.style.display = 'none'; passwordInput.value = ''; currentCode = null; currentPassword = null; currentLink = null; });
        const codeInput = document.getElementById('codeInput'); const loadBtn = document.getElementById('loadBtn'); const player = document.getElementById('player'); const receivePasswordGroup = document.getElementById('receivePasswordGroup'); const receivePassword = document.getElementById('receivePassword');
        codeInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
        let needsPassword = false;
        loadBtn.addEventListener('click', async () => { const code = codeInput.value.trim().toUpperCase(); if (!code) return; loadBtn.disabled = true; loadBtn.textContent = 'Loading...'; try { const res = await fetch('/' + code); const data = await res.json(); if (data.exists) { needsPassword = data.needsPassword; if (needsPassword) { receivePasswordGroup.style.display = 'block'; if (!receivePassword.value) { receivePassword.focus(); loadBtn.disabled = false; loadBtn.textContent = 'Unlock'; return; } } const playRes = await fetch('/' + code + '/play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: receivePassword.value || '' }) }); const playData = await playRes.json(); if (playRes.status === 401) { toast('Invalid password', 'error'); loadBtn.disabled = false; loadBtn.textContent = 'Unlock'; return; } if (playData.success) startPlayer(playData.audio, data); else toast('Message expired or not found', 'error'); } else toast('Not found', 'error'); } catch (err) { toast('Error', 'error'); } loadBtn.disabled = false; loadBtn.textContent = 'Unlock'; });
        receivePassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadBtn.click(); });
        function startPlayer(base64Audio, info) { player.classList.add('show'); const binaryString = atob(base64Audio); const bytes = new Uint8Array(binaryString.length); for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i); const blob = new Blob([bytes.buffer], { type: 'audio/webm' }); audioElement = new Audio(URL.createObjectURL(blob)); audioElement.volume = 0.8; audioElement.play(); visualize(audioElement); let remaining = info.remaining; const countdown = document.getElementById('countdown'); const interval = setInterval(() => { remaining--; const m = Math.floor(remaining / 60); const s = remaining % 60; countdown.textContent = m + ':' + s.toString().padStart(2, '0'); if (remaining <= 0) { clearInterval(interval); triggerExplosion(); } }, 1000); document.getElementById('destroyBtn').onclick = () => { clearInterval(interval); audioElement.pause(); triggerExplosion(); }; audioElement.onended = () => { if (info.destroyMode === 'play' || info.destroyMode === 'both') { clearInterval(interval); triggerExplosion(); } }; }
        function visualize(audio) { const canvas = document.getElementById('visualizer'); const ctx = canvas.getContext('2d'); canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; ctx.scale(2, 2); const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); const source = audioCtx.createMediaElementSource(audio); const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); analyser.connect(audioCtx.destination); const data = new Uint8Array(analyser.frequencyBinCount); function draw() { requestAnimationFrame(draw); analyser.getByteFrequencyData(data); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight); const barW = canvas.offsetWidth / analyser.frequencyBinCount * 2; let x = 0; for (let i = 0; i < analyser.frequencyBinCount; i++) { const h = (data[i] / 255) * canvas.offsetHeight; ctx.fillStyle = 'hsl(' + (i * 2) + ', 80%, 50%)'; ctx.fillRect(x, canvas.offsetHeight - h, barW - 1, h); x += barW; } } draw(); }
        function triggerExplosion() { document.getElementById('explosion').style.display = 'block'; playSound(); setTimeout(() => { document.getElementById('explosion').style.display = 'none'; player.classList.remove('show'); toast('Audio destroyed!', 'success'); }, 1500); }
        function playSound() { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5); gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); osc.start(); osc.stop(ctx.currentTime + 0.5); }
        function toast(msg, type = 'info') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast ' + type + ' show'; setTimeout(() => t.classList.remove('show'), 3000); }
        function checkUrl() { const hash = window.location.hash.slice(1); if (hash && hash.length >= 6) { document.querySelector('[data-tab="receive"]').click(); codeInput.value = hash.toUpperCase(); setTimeout(() => loadBtn.click(), 300); } }
        window.addEventListener('hashchange', checkUrl); checkUrl();
    </script>
</body>
</html>`;
}

app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

app.get('/', async (c) => {
  return c.html(generateIndexHTML());
});

app.get('/admin', async (c) => {
  return c.html(ADMIN_HTML(CONFIG));
});

app.get('/index.html', async (c) => {
  return c.redirect('/', 302);
});

app.get('/robots.txt', async (c) => {
  return c.text(`User-agent: *\nAllow: /\nSitemap: https://earbomb.org/sitemap.xml`);
});

app.get('/sitemap.xml', async (c) => {
  return c.html(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://earbomb.org/</loc><changefreq>daily</changefreq><priority>1.0</priority></url><url><loc>https://earbomb.org/admin</loc><changefreq>monthly</changefreq><priority>0.3</priority></url></urlset>`);
});

app.get('/api/config', async (c) => {
  return c.json(CONFIG);
});

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

app.notFound(async (c) => {
  return c.html(generateIndexHTML());
});

export default app;
