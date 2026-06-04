#!/usr/bin/env node
/*
  Usage:
    node importToFirebase.js --serviceAccount ./serviceAccount.json --input ./scheduler-backup-2026-06-04.json --defaultPassword "ChangeMe123!"

  This script imports a backup JSON (in the repo format) into Firestore under
  `userdata` documents and creates Firebase Auth users using the Admin SDK.

  IMPORTANT: Do NOT commit your service account JSON. Place it locally and pass
  the path via --serviceAccount.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function usage() {
  console.log('Usage: node importToFirebase.js --serviceAccount <path> --input <path> [--defaultPassword <pw>]');
  process.exit(1);
}

const argv = require('minimist')(process.argv.slice(2));
if (!argv.serviceAccount || !argv.input) usage();

const serviceAccountPath = path.resolve(argv.serviceAccount);
const inputPath = path.resolve(argv.input);
const defaultPassword = argv.defaultPassword || argv.defaultPassword || 'ChangeMe123!';

if (!fs.existsSync(serviceAccountPath)) { console.error('serviceAccount file not found:', serviceAccountPath); process.exit(1); }
if (!fs.existsSync(inputPath)) { console.error('input file not found:', inputPath); process.exit(1); }

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();

async function ensureUser(u) {
  try {
    const existing = await admin.auth().getUserByEmail(u.email);
    return existing.uid;
  } catch (e) {
    // create user
    const passwordToUse = argv.pw || argv.defaultPassword || defaultPassword;
    const created = await admin.auth().createUser({ email: u.email, password: passwordToUse, displayName: u.name });
    if (u.isAdmin) {
      await admin.auth().setCustomUserClaims(created.uid, { admin: true });
    }
    return created.uid;
  }
}

function extractSuffix(key) {
  var m = key.match(/(.+)_([^_]+)$/);
  if (!m) return null;
  return { base: m[1], suffix: m[2] };
}

(async function main(){
  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);

  // Build username->userinfo map from file
  const users = (data.users || []).reduce((acc, u) => { acc[u.username] = u; return acc; }, {});

  // Ensure auth users and map username->uid
  const usernameToUid = {};
  for (const u of (data.users || [])) {
    try {
      const uid = await ensureUser(u);
      usernameToUid[u.username] = uid;
      console.log('User ready:', u.username, '->', uid);
    } catch (e) {
      console.error('Failed to ensure user', u.username, e);
    }
  }

  // Process keys
  for (const key of Object.keys(data)) {
    if (key === 'exportedAt' || key === 'users') continue;
    // announcements -> top-level collection
    if (key === 'announcements' && Array.isArray(data[key])) {
      const items = data[key];
      for (const a of items) {
        const docId = a.id ? String(a.id) : undefined;
        const ref = docId ? firestore.collection('announcements').doc(docId) : firestore.collection('announcements').doc();
        await ref.set(a);
      }
      console.log('Imported announcements:', items.length);
      continue;
    }

    const m = extractSuffix(key);
    if (m && users[m.suffix]) {
      // Write to that user's userdata doc, strip suffix from key
      const targetUsername = m.suffix;
      const baseKey = m.base;
      const uid = usernameToUid[targetUsername];
      if (!uid) { console.warn('No uid found for', targetUsername); continue; }
      const docRef = firestore.collection('userdata').doc(uid);
      // merge array/object into doc under baseKey
      const payload = {};
      payload[baseKey] = data[key];
      await docRef.set(payload, { merge: true });
      console.log('Wrote', baseKey, 'to', targetUsername);
      continue;
    }

    // Unknown key: write to a global collection under 'imports'
    try {
      await firestore.collection('imports').doc().set({ key: key, value: data[key] });
      console.log('Stored unknown key in imports:', key);
    } catch (e) {
      console.error('Failed storing unknown key', key, e);
    }
  }

  // Ensure each user has a `profile` document inside their userdata doc
  for (const u of (data.users || [])) {
    const uid = usernameToUid[u.username];
    if (!uid) continue;
    const profile = { username: u.username, name: u.name, email: u.email, isAdmin: u.isAdmin || false, role: u.role || 'executive_path' };
    await firestore.collection('userdata').doc(uid).set({ profile: profile }, { merge: true });
    console.log('Set profile for', u.username);
  }

  console.log('Import complete. Please verify data in the Firebase console.');
  process.exit(0);
})();
