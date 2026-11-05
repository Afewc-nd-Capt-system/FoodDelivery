const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.prebuild = 'node -e "require(\'fs\').rmSync(\'.next\',{recursive:true,force:true})"';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('prebuild:', pkg.scripts.prebuild);
