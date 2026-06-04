Migration to Firebase
=====================

Steps to import existing backup data into your Firebase project:

1. Obtain a Firebase service account JSON from the Firebase Console (Project Settings -> Service accounts) and save it locally as `serviceAccount.json` (do NOT commit this file).

2. Install dependencies:

```sh
npm install
```

3. Import a backup JSON (examples are in the repo root: `scheduler-backup-*.json`):

```sh
node scripts/importToFirebase.js --serviceAccount ./serviceAccount.json --input ./scheduler-backup-2026-06-04.json --defaultPassword "ChangeMe123!"
```

The script will:
- Create Firebase Auth users (if they don't exist) using the provided `--defaultPassword`.
- Create/merge a `profile` object in `userdata/<uid>` for each user.
- Import per-user keys (like `it_services_<username>`) into the corresponding `userdata/<uid>` document as `it_services`.
- Import `announcements` into a top-level `announcements` collection.

4. To create a single user account (for yourself), run:

```sh
node scripts/createFirebaseUser.js --serviceAccount ./serviceAccount.json --email you@example.com --username your_username --name "Your Name" --password "ChangeMe123!"
```

5. After import, verify data in Firebase Console (Firestore and Authentication) and log in via the app.

If you want, I can run or adapt these scripts further (e.g., preserve original passwords if you provide them), or create a temporary admin account for you — tell me the desired username and email.
