// ==================== FIREBASE DATA LAYER ====================
// Handles Firestore reads/writes with a synchronous cache
// so existing code (getData/saveData) continues to work.

window.__fbCache = {};
window.__fbLoaded = false;
window.__fbUser = null;

// Initialize Firebase Auth state listener
function initFirebase(callback) {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.__fbUser = user;
      // Try to restore session from localStorage first
      var localSession = JSON.parse(localStorage.getItem('session') || 'null');
      if (localSession && localSession.loggedIn && localSession.firebaseUid === user.uid) {
        window.__fbLoaded = true;
        if (callback) callback(null, user);
        return;
      }
      // Load data from Firestore
      loadFBData(user.uid, function(err) {
        if (callback) callback(err, user);
      });
    } else {
      window.__fbUser = null;
      window.__fbCache = {};
      window.__fbLoaded = false;
      if (callback) callback(null, null);
    }
  });
}

// Load all user data from Firestore into cache
function loadFBData(uid, callback) {
  firebase.firestore().collection('userdata').doc(uid).get()
    .then(function(doc) {
      if (doc.exists) {
        window.__fbCache = doc.data() || {};
        window.__fbLoaded = true;
      } else {
        // First login — try migrating from localStorage
        window.__fbCache = {};
        window.__fbLoaded = true;
        migrateLocalStorage(uid, function() {
          if (callback) callback();
        });
        return;
      }
      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Firestore load error:', err);
      if (callback) callback(err);
    });
}

// Save data to Firestore (merge into user doc)
function saveFB(key, data, callback) {
  window.__fbCache[key] = data;
  if (!window.__fbUser) {
    if (callback) callback('Not authenticated');
    return;
  }
  firebase.firestore().collection('userdata').doc(window.__fbUser.uid)
    .set({ [key]: data }, { merge: true })
    .then(function() { if (callback) callback(); })
    .catch(function(err) { console.error('Firestore save error:', err); if (callback) callback(err); });
}

// Read from cache
function getFB(key) {
  if (!window.__fbLoaded) return null;
  return window.__fbCache[key];
}

// ==================== SESSION HELPERS ====================
// Keep localStorage session for backward compatibility with existing UI code.
// Firebase Auth is the source of truth; session is updated on auth changes.

function fbGetSession() {
  return JSON.parse(localStorage.getItem('session') || 'null');
}

function fbSaveSession(data) {
  localStorage.setItem('session', JSON.stringify(data));
}

function fbClearSession() {
  localStorage.removeItem('session');
}

// ==================== MIGRATION ====================
// One-time migration from localStorage to Firestore.
// Called automatically on first login with Firebase.

function migrateLocalStorage(uid, callback) {
  var migrated = {};
  var count = 0;

  // Collect all localStorage keys
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  // Filter keys that belong to this user (session username)
  var session = JSON.parse(localStorage.getItem('session') || 'null');
  var username = session ? session.username : null;

  if (!username) {
    if (callback) callback();
    return;
  }

  // Find user-specific keys
  var userKeys = keys.filter(function(k) {
    return k.indexOf('tasks_' + username) === 0 ||
           k.indexOf('plans_' + username) === 0 ||
           k.indexOf('milestones_' + username) === 0 ||
           k.indexOf('dailylog_' + username) === 0 ||
           k.indexOf('trips_' + username) === 0 ||
           k.indexOf('it_') === 0 && k.indexOf('_' + username) > 0;
  });

  // Also migrate welcome_ and tutorial_ flags
  var flags = keys.filter(function(k) {
    return k === 'welcome_' + username || k === 'tutorial_' + username;
  });

  userKeys.forEach(function(k) {
    try {
      var val = JSON.parse(localStorage.getItem(k));
      if (Array.isArray(val) && val.length > 0) {
        migrated[k] = val;
        count++;
      }
    } catch(e) {}
  });

  flags.forEach(function(k) {
    migrated[k] = localStorage.getItem(k);
    count++;
  });

  if (count > 0) {
    firebase.firestore().collection('userdata').doc(uid)
      .set(migrated, { merge: true })
      .then(function() {
        console.log('Migrated ' + count + ' localStorage keys to Firestore.');
        // Reload cache
        loadFBData(uid, callback);
      })
      .catch(function(err) {
        console.error('Migration error:', err);
        if (callback) callback(err);
      });
  } else {
    if (callback) callback();
  }
}

// ==================== FIREBASE AUTH WRAPPERS ====================

function fbLogin(email, password, callback) {
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(function(result) {
      var user = result.user;
      // After login, wait for data to load, then set session
      loadFBData(user.uid, function() {
        var profile = getFB('profile') || {};
        var session = {
          username: profile.username || user.email.split('@')[0],
          name: profile.name || user.displayName || profile.username || user.email.split('@')[0],
          email: user.email,
          isAdmin: profile.isAdmin || false,
          role: profile.role || 'executive_path',
          firebaseUid: user.uid,
          loggedIn: true,
          timestamp: Date.now()
        };
        fbSaveSession(session);
        if (callback) callback(null, session);
      });
    })
    .catch(function(err) {
      if (callback) callback(err);
    });
}

function fbRegister(email, password, profile, callback) {
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(function(result) {
      var user = result.user;
      var session = {
        username: profile.username,
        name: profile.name,
        email: email,
        isAdmin: profile.isAdmin || false,
        role: profile.role || 'executive_path',
        firebaseUid: user.uid,
        loggedIn: true,
        timestamp: Date.now()
      };
      fbSaveSession(session);
      // Save profile and initial data to Firestore
      var userData = {
        profile: {
          username: profile.username,
          name: profile.name,
          email: email,
          isAdmin: profile.isAdmin || false,
          role: profile.role || 'executive_path'
        }
      };
      firebase.firestore().collection('userdata').doc(user.uid)
        .set(userData, { merge: true })
        .then(function() {
          window.__fbCache = userData;
          window.__fbLoaded = true;
          // Set welcome flag for the portal to pick up
          localStorage.setItem('welcome_' + profile.username, 'true');
          if (callback) callback(null, session);
        });
    })
    .catch(function(err) {
      if (callback) callback(err);
    });
}

function fbLogout(callback) {
  fbClearSession();
  window.__fbCache = {};
  window.__fbLoaded = false;
  window.__fbUser = null;
  firebase.auth().signOut()
    .then(function() { if (callback) callback(); })
    .catch(function(err) { if (callback) callback(err); });
}

