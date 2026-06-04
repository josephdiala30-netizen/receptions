// Restore backup JSON to Firebase Firestore
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: "AIzaSyBgQyeHQrOvGMgp5erVDYhkNFIa5GvAtyM",
  authDomain: "kalyx-36f0d.firebaseapp.com",
  projectId: "kalyx-36f0d",
  storageBucket: "kalyx-36f0d.firebasestorage.app",
  messagingSenderId: "537183146799",
  appId: "1:537183146799:web:7b145625e0c6f6bdc7c7da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const KNOWN_PASSWORDS = {
  'superadmin': 'password',
  'admin': 'password',
  'joseph_diala': 'joseph',
  'executive': 'executive',
  'task_admin': 'executive',
  'it_executive': 'itadmin',
  'it_admin': 'itadmin'
};

async function migrate() {
  console.log('=== RESTORE BACKUP TO FIRESTORE ===\n');

  const raw = fs.readFileSync('scheduler-backup-2026-06-04.json', 'utf8');
  const backup = JSON.parse(raw);
  const users = backup.users || [];
  const dataKeys = Object.keys(backup).filter(k => k !== 'exportedAt' && k !== 'users');

  console.log('Backup file loaded.');
  console.log('Users: ' + users.length);
  console.log('Data keys: ' + dataKeys.length + '\n');

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const username = user.username;
    const email = user.email;
    const password = KNOWN_PASSWORDS[username];

    if (!password) {
      console.log('  SKIP: ' + username + ' (no known password)');
      skipped++;
      continue;
    }

    // Check if this user has any data in the backup
    const userDataKeys = dataKeys.filter(k => k.indexOf('_' + username) > 0);
    const hasData = userDataKeys.some(k => {
      const val = backup[k];
      return Array.isArray(val) && val.length > 0;
    });

    if (!hasData) {
      console.log('  SKIP: ' + username + ' (no data to restore)');
      skipped++;
      continue;
    }

    console.log('  Processing: ' + username + ' (' + email + ')...');

    try {
      let uid;
      let isNew = false;

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        console.log('    Signed in. UID: ' + uid);
      } catch (signInErr) {
        if (signInErr.code === 'auth/user-not-found') {
          console.log('    User not found. Creating account...');
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          uid = cred.user.uid;
          isNew = true;
          console.log('    Account created. UID: ' + uid);
        } else if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
          console.log('    WRONG PASSWORD for ' + username + ' — skipping');
          failed++;
          continue;
        } else {
          throw signInErr;
        }
      }

      // Build Firestore data
      const firestoreData = {
        profile: {
          username: user.username,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin || false,
          role: user.role || 'executive_path'
        }
      };

      let dataCount = 0;
      userDataKeys.forEach(k => {
        const val = backup[k];
        if (Array.isArray(val) && val.length > 0) {
          const suffix = '_' + username;
          const fbKey = k.endsWith(suffix) ? k.slice(0, -suffix.length) : k;
          firestoreData[fbKey] = val;
          dataCount += val.length;
          console.log('    + ' + k + ' (' + val.length + ' records) → ' + fbKey);
        }
      });

      await setDoc(doc(db, 'userdata', uid), firestoreData, { merge: true });
      console.log('    Uploaded! (' + dataCount + ' total records)');
      success++;

      // Sign out to clear session for next user
      await auth.signOut();

    } catch (err) {
      console.log('    ERROR: ' + err.message);
      failed++;
      try { await auth.signOut(); } catch(e) {}
    }
  }

  console.log('\n=== RESTORE COMPLETE ===');
  console.log('Success: ' + success);
  console.log('Skipped: ' + skipped);
  console.log('Failed: ' + failed);
  process.exit(0);
}

migrate().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
