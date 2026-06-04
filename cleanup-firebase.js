// Cleanup script — deletes all Firestore userdata except superadmin
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, deleteDoc, setDoc } = require('firebase/firestore');

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

async function cleanup() {
  console.log('=== SYSTEM CLEANUP ===');
  console.log('Signing in as superadmin...');

  try {
    const cred = await signInWithEmailAndPassword(auth, 'superadmin@kalyx.com', 'password');
    const superadminUid = cred.user.uid;
    console.log('Signed in! UID: ' + superadminUid);

    console.log('\nFetching all userdata documents...');
    const snapshot = await getDocs(collection(db, 'userdata'));
    console.log('Found ' + snapshot.size + ' document(s).\n');

    let deleted = 0;
    let kept = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const profile = data.profile || {};
      const username = profile.username || '(unknown)';

      if (docSnap.id === superadminUid || username === 'superadmin') {
        console.log('  KEEPING: ' + username + ' (' + docSnap.id + ')');
        
        // Clean superadmin data — keep only profile
        const dataKeys = Object.keys(data).filter(k => k !== 'profile');
        if (dataKeys.length > 0) {
          console.log('    Cleaning ' + dataKeys.length + ' data keys from superadmin...');
          await setDoc(doc(db, 'userdata', docSnap.id), { profile: profile });
          console.log('    Superadmin data cleaned. Only profile remains.');
        }
        kept++;
      } else {
        console.log('  DELETING: ' + username + ' (' + (profile.email || docSnap.id) + ')...');
        await deleteDoc(doc(db, 'userdata', docSnap.id));
        console.log('    Deleted!');
        deleted++;
      }
    }

    console.log('\n=== CLEANUP COMPLETE ===');
    console.log('Deleted: ' + deleted + ' user(s)');
    console.log('Kept: ' + kept + ' user(s) (superadmin only)');
    console.log('\nNOTE: Firebase Auth accounts still exist in the Firebase Console.');
    console.log('To delete them, go to Firebase Console > Authentication > Users.');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR: ' + err.message);
    process.exit(1);
  }
}

cleanup();
