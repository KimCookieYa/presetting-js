const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'index.js');
const shebang = '#!/usr/bin/env node\n';
const data = fs.readFileSync(distPath, 'utf8');

if (!data.startsWith(shebang)) {
  fs.writeFileSync(distPath, shebang + data);
  fs.chmodSync(distPath, '755');
}
