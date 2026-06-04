// ==================== FIREBASE DATA LAYER ====================
// Handles Firestore reads/writes with a synchronous cache
// so existing code (getData/saveData) continues to work.

window.__fbCache = {};
window.__fbLoaded = false;
window.__fbUser = null;
window.__fbUnsubscribe = null;

// Initialize Firebase Auth state listener
function initFirebase(callback) {
  firebase.auth().onAuthStateChanged(function(user) {
    // Unsubscribe previous real-time listener
    if (window.__fbUnsubscribe) { window.__fbUnsubscribe(); window.__fbUnsubscribe = null; }
    if (user) {
      window.__fbUser = user;
      // Load data from Firestore (one-time read)
      loadFBData(user.uid, function(err) {
        // Set up real-time listener for cross-browser sync
        fbSubscribe(user.uid);
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

// Load all user data from Firestore into cache (one-time read)
function loadFBData(uid, callback) {
  firebase.firestore().collection('userdata').doc(uid).get()
    .then(function(doc) {
      if (doc.exists) {
        var data = doc.data() || {};
        window.__fbCache = data;
        window.__fbLoaded = true;

        var username = data.profile ? data.profile.username : null;
        if (username) syncCacheToLocalStorage(username);

        // If profile exists but no data keys, migrate from localStorage
        var dataKeys = Object.keys(data).filter(function(k) { return k !== 'profile'; });
        if (dataKeys.length === 0) {
          migrateLocalStorage(uid, function() {
            if (callback) callback();
          });
          return;
        }
      } else {
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

// Set up real-time listener for cross-browser sync (optional, called after init)
function fbSubscribe(uid, onUpdate) {
  if (window.__fbUnsubscribe) { window.__fbUnsubscribe(); }
  window.__fbUnsubscribe = firebase.firestore().collection('userdata').doc(uid)
    .onSnapshot(function(doc) {
      if (doc.exists) {
        var data = doc.data() || {};
        window.__fbCache = data;
        window.__fbLoaded = true;
        var username = data.profile ? data.profile.username : null;
        if (username) syncCacheToLocalStorage(username);
        if (onUpdate) onUpdate(data);
        if (window.__fbOnUpdate) window.__fbOnUpdate(data);
      }
    }, function(err) {
      console.error('Firestore listener error:', err);
    });
}

// Sync cached Firestore data back to localStorage for offline support and UI compatibility
function syncCacheToLocalStorage(username) {
  if (!username) return;
  var cache = window.__fbCache || {};
  
  if (cache.tasks) localStorage.setItem('tasks_' + username, JSON.stringify(cache.tasks));
  if (cache.plans) localStorage.setItem('plans_' + username, JSON.stringify(cache.plans));
  if (cache.dailylog) localStorage.setItem('dailylog_' + username, JSON.stringify(cache.dailylog));
  if (cache.trips) localStorage.setItem('trips_' + username, JSON.stringify(cache.trips));
  if (cache.milestones) localStorage.setItem('milestones_' + username, JSON.stringify(cache.milestones));
  
  Object.keys(cache).forEach(function(k) {
    if (k.indexOf('it_') === 0) {
      localStorage.setItem(k + '_' + username, JSON.stringify(cache[k]));
    }
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

// Set callback for real-time data changes (re-render UI)
function fbOnUpdate(callback) {
  window.__fbOnUpdate = callback;
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
        // Strip the '_username' suffix to match the Firestore keys that the app uses
        var suffix = '_' + username;
        var fbKey = k.endsWith(suffix) ? k.slice(0, -suffix.length) : k;
        migrated[fbKey] = val;
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
      window.__fbUser = user;
      // Lightweight login: read only the profile, redirect immediately
      // Full data loads asynchronously on the target page via initAuth
      firebase.firestore().collection('userdata').doc(user.uid).get()
        .then(function(doc) {
          var profile = {};
          if (doc.exists) {
            var data = doc.data() || {};
            window.__fbCache = data;
            window.__fbLoaded = true;
            profile = data.profile || {};
          } else {
            window.__fbCache = {};
            window.__fbLoaded = true;
          }
          // Merge local user data into profile — localStorage is authoritative for role/isAdmin
          var localUsers = JSON.parse(localStorage.getItem('users') || '[]');
          var localUser = localUsers.find(function(u) {
            return u.email === user.email || u.username === (profile.username || user.email.split('@')[0]);
          });
          if (localUser) {
            if (localUser.isAdmin !== undefined && localUser.isAdmin !== null) profile.isAdmin = localUser.isAdmin;
            if (localUser.role) profile.role = localUser.role;
            if (!profile.username) profile.username = localUser.username;
            if (!profile.name) profile.name = localUser.name;
          }
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
          // Sync Firestore profile with correct admin data if it was mismatched
          var updatedProfile = { username: session.username, name: session.name, email: session.email, isAdmin: session.isAdmin, role: session.role };
          firebase.firestore().collection('userdata').doc(user.uid).set({ profile: updatedProfile }, { merge: true }).catch(function(e) {});
          if (callback) callback(null, session);
        })
        .catch(function(err) {
          console.error('Profile read error:', err);
          // Fallback session even if Firestore read fails
          var localUsers = JSON.parse(localStorage.getItem('users') || '[]');
          var localUser = localUsers.find(function(u) { return u.email === user.email; });
          var session = {
            username: user.email.split('@')[0],
            name: user.email.split('@')[0],
            email: user.email,
            isAdmin: localUser ? localUser.isAdmin || false : false,
            role: localUser ? (localUser.role || 'executive_path') : 'executive_path',
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
  // Set flag to prevent onAuthStateChanged auto-redirect
  window.__fbRegistering = true;
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(function(result) {
      var user = result.user;
      var userData = {
        profile: {
          username: profile.username,
          name: profile.name,
          email: email,
          isAdmin: profile.isAdmin || false,
          role: profile.role || 'executive_path'
        }
      };
      return firebase.firestore().collection('userdata').doc(user.uid)
        .set(userData, { merge: true })
        .then(function() {
          localStorage.setItem('welcome_' + profile.username, 'true');
          return firebase.auth().signOut();
        });
    })
    .then(function() {
      window.__fbRegistering = false;
      fbClearSession();
      window.__fbCache = {};
      window.__fbLoaded = false;
      window.__fbUser = null;
      if (callback) callback(null, { username: profile.username, name: profile.name, role: profile.role });
    })
    .catch(function(err) {
      window.__fbRegistering = false;
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

