#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read API_BASE_URL from environment variable, default to api.earbomb.org
const apiBaseUrl = process.env.API_BASE_URL || 'https://api.earbomb.org';

const configContent = `// API configuration - auto-generated during build
window.API_BASE_URL = '${apiBaseUrl}';
`;

const configPath = path.join(__dirname, '../public/config.js');
fs.writeFileSync(configPath, configContent);

console.log(`Generated config.js with API_BASE_URL: ${apiBaseUrl}`);