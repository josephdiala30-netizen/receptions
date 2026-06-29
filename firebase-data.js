// ==================== FIREBASE DATA LAYER ====================
// Firestore is the single source of truth for all app data.
// localStorage is ONLY used for UI preferences (theme).
// Session is in-memory via window.__fbSession.

// --- Internal state ---
window.__fbCache = {};          // In-memory cache loaded from Firestore
window.__fbLoaded = false;      // Whether data has been loaded
window.__fbUser = null;         // { uid, email } from Firebase Auth
window.__fbSession = null;      // Session object (in-memory, NOT localStorage)
window.__fbUnsubscribe = null;  // Firestore snapshot unsubscribe fn
window.__fbAuthListener = null; // Auth state unsubscribe fn
window.__fbSaveToken = 0;       // Debounce token for saves
window.__fbLastData = '';       // Stringified last data to detect changes
window.__fbOnUpdate = null;     // External callback for real-time updates
window.__fbRegistering = false; // Flag to prevent auth handler interference

function getAuth() { return firebase.auth(); }
function getDb() { return firebase.firestore(); }

// Build session object from profile data + Firebase user
function buildSession(user, profile) {
  return {
    username: profile.username || user.email.split('@')[0],
    name: profile.name || profile.username || user.email.split('@')[0],
    email: user.email,
    isAdmin: profile.is_admin || false,
    executiveAdmin: profile.executive_admin || false,
    role: profile.role || 'executive_path',
    firebaseUid: user.uid,
    loggedIn: true,
    timestamp: Date.now()
  };
}

function initFirebase(callback) {
  var auth = getAuth();
  if (!auth) { if (callback) callback({ message: 'Firebase Auth not loaded' }); return; }

  function initUser(user) {
    window.__fbUser = { uid: user.uid, email: user.email };
    var db = getDb();
    if (db) {
      db.collection('profiles').doc(user.uid).get().then(function(doc) {
        var profile = doc.exists ? doc.data() : {};
        window.__fbSession = buildSession(user, profile);
        loadFBData(user.uid, function(err) {
          fbSubscribe(user.uid);
          if (callback) callback(err, window.__fbSession);
        });
      }).catch(function() {
        window.__fbSession = buildSession(user, {});
        loadFBData(user.uid, function(err) {
          fbSubscribe(user.uid);
          if (callback) callback(err, window.__fbSession);
        });
      });
    } else {
      window.__fbSession = buildSession(user, {});
      window.__fbCache = {};
      window.__fbLoaded = true;
      if (callback) callback(null, window.__fbSession);
    }
  }

  function clearUser() {
    window.__fbUser = null;
    window.__fbSession = null;
    window.__fbCache = {};
    window.__fbLoaded = false;
    if (window.__fbUnsubscribe) { window.__fbUnsubscribe(); window.__fbUnsubscribe = null; }
    if (callback) callback(null, null);
  }

  var currentUser = auth.currentUser;
  if (currentUser) {
    initUser(currentUser);
  }
  // If currentUser is null, wait for onAuthStateChanged instead
  // of immediately calling clearUser(). Otherwise portals redirect
  // to login before Firebase Auth restores the session from persistence.

  if (window.__fbAuthListener) { window.__fbAuthListener(); window.__fbAuthListener = null; }

  window.__fbAuthListener = auth.onAuthStateChanged(function(user) {
    if (window.__fbRegistering) return;
    if (window.__fbLoggingIn) return;
    if (user) {
      initUser(user);
    } else {
      clearUser();
    }
  });
}

function loadFBData(uid, callback) {
  var db = getDb();
  if (!db) { window.__fbCache = {}; window.__fbLoaded = true; clearLegacyLocalStorage(); if (callback) callback(); return; }

  db.collection('userdata').doc(uid).get()
    .then(function(doc) {
      window.__fbCache = doc.exists ? (doc.data().data || {}) : {};
      window.__fbLoaded = true;
      clearLegacyLocalStorage();
      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Firestore load error:', err);
      window.__fbCache = {};
      window.__fbLoaded = true;
      clearLegacyLocalStorage();
      if (callback) callback(err);
    });
}

function fbSubscribe(uid, onUpdate) {
  var db = getDb();
  if (!db) return;
  if (window.__fbUnsubscribe) { window.__fbUnsubscribe(); window.__fbUnsubscribe = null; }
  window.__fbUnsubscribe = db.collection('userdata').doc(uid)
    .onSnapshot(function(doc) {
      if (!doc.exists) return;
      var incoming = doc.data().data || {};
      var incomingStr = JSON.stringify(incoming);
      if (incomingStr === window.__fbLastData) return;
      window.__fbCache = incoming;
      window.__fbLoaded = true;
      if (onUpdate) onUpdate(incoming);
      if (window.__fbOnUpdate) window.__fbOnUpdate(incoming);
    }, function(err) {
      console.error('Firestore snapshot error:', err);
    });
}

function saveFB(key, data, callback) {
  window.__fbCache[key] = data;
  saveFBFull(callback);
}

function saveFBFull(callback) {
  var db = getDb();
  if (!db) { if (callback) callback('Firestore not loaded'); return; }
  if (!window.__fbUser) { if (callback) callback('Not authenticated'); return; }
  window.__fbLastData = JSON.stringify(window.__fbCache);
  db.collection('userdata').doc(window.__fbUser.uid).set({
    data: window.__fbCache,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() { if (callback) callback(); })
    .catch(function(err) { console.error('Firestore save error:', err); if (callback) callback(err); });
}

function fbOnUpdate(callback) { window.__fbOnUpdate = callback; }

function getFB(key) {
  if (!window.__fbLoaded) return null;
  return window.__fbCache[key];
}

function getFBOr(key, fallback) {
  if (!window.__fbLoaded) return fallback;
  return key in window.__fbCache ? window.__fbCache[key] : fallback;
}

function storeFB(key, data) {
  window.__fbCache[key] = data;
  saveFBFull();
}

function clearLegacyLocalStorage() {
  var prefixes = ['tasks_', 'plans_', 'milestones_', 'dailylog_', 'trips_', 'shared_tasks_',
    'it_services_', 'it_maintenance_', 'it_assets_', 'it_inventory_', 'it_task_',
    'it_planner_', 'it_accomplishments_', 'it_tickets_', 'it_systems_', 'it_audit_',
    'it_knowledge_', 'it_timetrack_', 'it_roadmap_', 'avatar_', 'tutorial_',
    'lastNotifCheck_', 'pomodoroCount_', 'scratchpad_', 'notifications_',
    'welcome_', 'editTripId'];
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (prefixes.some(function(p) { return k.indexOf(p) === 0; })) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
}

// Cross-page state (replaces editTripId in localStorage)
window.__pageState = {};

function setPageState(key, value) { window.__pageState[key] = value; }
function getPageState(key) { return window.__pageState[key]; }
function removePageState(key) { delete window.__pageState[key]; }

function fbGetSession() { return window.__fbSession; }

// ==================== AUTH WRAPPERS ====================

function fbLogin(email, password, callback) {
  var auth = getAuth();
  if (!auth) { if (callback) callback({ message: 'Firebase not loaded' }); return; }

  auth.signInWithEmailAndPassword(email, password)
    .then(function(result) {
      var user = result.user;
      window.__fbUser = { uid: user.uid, email: user.email };
      var db = getDb();

      if (db) {
        db.collection('profiles').doc(user.uid).get().then(function(doc) {
          var profile = doc.exists ? doc.data() : {};
          var session = buildSession(user, profile);
          window.__fbSession = session;

          // Ensure profile exists in Firestore
          db.collection('profiles').doc(user.uid).set({
            username: session.username,
            name: session.name,
            email: session.email,
            role: session.role,
            is_admin: session.isAdmin,
            executive_admin: session.executiveAdmin
          }).catch(function(e) { console.error('Profile sync error:', e); });

          loadFBData(user.uid, function(err) {
            if (callback) callback(err, session);
          });
        }).catch(function() {
          var session = buildSession(user, {});
          window.__fbSession = session;
          loadFBData(user.uid, function(err) {
            if (callback) callback(err, session);
          });
        });
      } else {
        var session = buildSession(user, {});
        window.__fbSession = session;
        loadFBData(user.uid, function(err) {
          if (callback) callback(err, session);
        });
      }
    })
    .catch(function(err) { if (callback) callback(err); });
}

function fbRegister(email, password, profile, callback) {
  window.__fbRegistering = true;
  var auth = getAuth();
  if (!auth) { window.__fbRegistering = false; if (callback) callback({ message: 'Firebase not loaded' }); return; }

  auth.createUserWithEmailAndPassword(email, password)
    .then(function(result) {
      var user = result.user;
      var uid = user.uid;
      var db = getDb();
      var p = {
        username: profile.username,
        name: profile.name,
        email: email,
        role: profile.role || 'executive_task',
        is_admin: profile.isAdmin || false,
        executive_admin: profile.executiveAdmin || false
      };

      function done(err, ok) { window.__fbRegistering = false; if (callback) callback(err, ok); }

      if (db) {
        Promise.all([
          db.collection('profiles').doc(uid).set(p),
          db.collection('userdata').doc(uid).set({ data: {} })
        ]).then(function() {
          done(null, { username: profile.username, name: profile.name, role: profile.role });
        }).catch(function(err) { console.error('Firestore write error:', err); done(err); });
      } else {
        done(null, { username: profile.username, name: profile.name, role: profile.role });
      }
    })
    .catch(function(err) { window.__fbRegistering = false; if (callback) callback(err); });
}

function fbLogout(callback) {
  window.__fbSession = null;
  window.__fbCache = {};
  window.__fbLoaded = false;
  window.__fbUser = null;
  var auth = getAuth();
  if (!auth) { if (callback) callback(); return; }
  auth.signOut().then(function() {
    if (window.__fbAuthListener) { window.__fbAuthListener(); window.__fbAuthListener = null; }
    if (callback) callback();
  }).catch(function(err) { if (callback) callback(err); });
}

// ==================== ADMIN HELPERS (Firestore-based) ====================

// Load all users from Firestore profiles collection
function loadUsersFromFirestore(callback) {
  var db = getDb();
  if (!db) { if (callback) callback([]); return; }
  db.collection('profiles').get().then(function(snapshot) {
    var users = [];
    snapshot.forEach(function(doc) {
      var d = doc.data();
      users.push({
        id: doc.id,
        username: d.username,
        name: d.name || d.username,
        email: d.email || '',
        role: d.role || 'executive_task',
        isAdmin: d.is_admin || false,
        executiveAdmin: d.executive_admin || false
      });
    });
    window.__usersCache = users;
    if (callback) callback(users);
  }).catch(function(err) {
    console.error('Load users error:', err);
    if (callback) callback([]);
  });
}

// Get users from cache (sync, populated by loadUsersFromFirestore)
function getUsers() { return window.__usersCache || []; }

// Save user list to Firestore (updates profiles, creates if needed)
function saveUserToFirestore(user, callback) {
  var db = getDb();
  if (!db) { if (callback) callback('Firestore not loaded'); return; }

  var profile = {
    username: user.username,
    name: user.name || user.username,
    email: user.email || (user.username + '@app.local'),
    role: user.role || 'executive_task',
    is_admin: user.isAdmin || false,
    executive_admin: user.executiveAdmin || false
  };

  if (user.id) {
    db.collection('profiles').doc(user.id).set(profile)
      .then(function() { if (callback) callback(); })
      .catch(function(err) { if (callback) callback(err); });
  } else {
    db.collection('profiles').where('username', '==', user.username).get()
      .then(function(snapshot) {
        if (snapshot.empty) {
          return db.collection('profiles').add(profile).then(function(ref) {
            user.id = ref.id;
            if (callback) callback();
          });
        } else {
          var uid = snapshot.docs[0].id;
          user.id = uid;
          return db.collection('profiles').doc(uid).set(profile).then(function() {
            if (callback) callback();
          });
        }
      })
      .catch(function(err) { if (callback) callback(err); });
  }
}

// Collect all data for a user from Firestore (via cache if loaded)
function collectUserDataFromFirestore(username, callback) {
  var db = getDb();
  if (!db) { if (callback) callback({}); return; }

  db.collection('profiles').where('username', '==', username).get()
    .then(function(snapshot) {
      if (snapshot.empty) { if (callback) callback({}); return; }
      var uid = snapshot.docs[0].id;
      return db.collection('userdata').doc(uid).get().then(function(doc) {
        if (doc.exists) {
          if (callback) callback(doc.data().data || {});
        } else {
          if (callback) callback({});
        }
      });
    })
    .catch(function() { if (callback) callback({}); });
}

// Delete user from Firestore
function deleteUserFromFirestore(username, callback) {
  var db = getDb();
  if (!db) { if (callback) callback(); return; }
  db.collection('profiles').where('username', '==', username).get()
    .then(function(snapshot) {
      if (snapshot.empty) { if (callback) callback(); return; }
      var uid = snapshot.docs[0].id;
      Promise.all([
        db.collection('profiles').doc(uid).delete(),
        db.collection('userdata').doc(uid).delete()
      ]).then(function() { if (callback) callback(); })
        .catch(function(err) { if (callback) callback(err); });
    })
    .catch(function(err) { if (callback) callback(err); });
}
