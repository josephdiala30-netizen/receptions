#!/usr/bin/env node
/*
  Usage:
    node createFirebaseUser.js --serviceAccount ./serviceAccount.json --email user@example.com --username myuser --name "My Name" --password "ChangeMe123!"

  Creates a Firebase Auth user and writes a `profile` object into `userdata/<uid>`.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

if (!argv.serviceAccount || !argv.email || !argv.username) {
  console.log('Usage: node createFirebaseUser.js --serviceAccount <path> --email <email> --username <username> --name <name> --password <pw>');
  process.exit(1);
}

const serviceAccountPath = path.resolve(argv.serviceAccount);
if (!fs.existsSync(serviceAccountPath)) { console.error('serviceAccount file not found:', serviceAccountPath); process.exit(1); }
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();

(async function(){
  try {
    let userRecord;
    try { userRecord = await admin.auth().getUserByEmail(argv.email); console.log('User already exists:', userRecord.uid); }
    catch(e) {
      userRecord = await admin.auth().createUser({ email: argv.email, password: argv.password || 'ChangeMe123!', displayName: argv.name || argv.username });
      console.log('Created user:', userRecord.uid);
    }

    const profile = { username: argv.username, name: argv.name || argv.username, email: argv.email, isAdmin: !!argv.isAdmin, role: argv.role || 'executive_path' };
    await firestore.collection('userdata').doc(userRecord.uid).set({ profile: profile }, { merge: true });
    console.log('Profile set for', argv.username, '->', userRecord.uid);
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  }
})();
