const crypto = require('crypto');
function h(p) { return crypto.createHash('sha256').update(p).digest('hex'); }

var stored = {
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9': ['admin', 'superadmin'],
  '92c1f38320e64405e98c349c27334b3bd6c636f88347b279ef2530b66354efc5': ['executive'],
  '47131d546b8283f7f716eb6feed18c9a75e8d6ea2fd39a2915bbc7ff50e681d1': ['it_executive', 'it_admin'],
  '67ca109ec8b0db7d75b90bbe4f0a8eafbd11663518d96362e48c1ed8c0c7afc6': ['task_admin']
};

var passwords = ['password','admin123','admin2026','executive','task2026','it2026','123456','admin','password123','pass123','letmein','test123','1234','pass','admin1','user','guest'];
passwords.forEach(function(p) {
  var hash = h(p);
  if (stored[hash]) {
    console.log('PASS: "' + p + '" -> accounts: ' + stored[hash].join(', '));
  }
});

var found = false;
for (var hash in stored) {
  var matched = passwords.some(function(p) { return h(p) === hash; });
  if (!matched) {
    console.log('NO MATCH for accounts: ' + stored[hash].join(', ') + ' (hash: ' + hash + ')');
    found = true;
  }
}
if (!found) console.log('All hashes matched!');
