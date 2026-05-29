const crypto = require('crypto');
function h(p) { return crypto.createHash('sha256').update(p).digest('hex'); }

var targetHash = '92c1f38320e64405e98c349c27334b3bd6c636f88347b279ef2530b66354efc5';

var guesses = [];
for (var base of ['executive', 'exec', 'task', 'it', 'admin', 'user']) {
  for (var suffix of ['', '123', '1234', '12345', '2024', '2025', '2026', '!', '@', '#', '1', 'pass', 'admin', 'user']) {
    guesses.push(base + suffix);
    if (base !== 'executive') guesses.push('executive' + suffix);
  }
}

for (var g of guesses) {
  if (h(g) === targetHash) {
    console.log('FOUND: password = "' + g + '"');
    process.exit(0);
  }
}
console.log('Not found in common guesses');
