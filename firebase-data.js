// ==================== SUPABASE DATA LAYER (replaces Firebase) ====================
// Maintains same function signatures as before so all pages work without changes.
// Firestore → Supabase PostgreSQL + Realtime
// Auth → Supabase Auth

window.__fbCache = {};
window.__fbLoaded = false;
window.__fbUser = null;
window.__fbUnsubscribe = null;
window.__fbAuthListener = null;

// Get the Supabase client
function getClient() {
  if (typeof supabaseClient !== 'undefined') return supabaseClient;
  if (typeof supabase !== 'undefined') {
    return supabase.createClient(
      SUPABASE_URL || 'https://xhweqrlyppvtksqbqrne.supabase.co',
      SUPABASE_ANON_KEY || 'sb_publishable_UMaXwhml3R_i0HFxYDuzXg_LtFmx96A',
      { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
    );
  }
  return null;
}

// Initialize Supabase Auth state listener
function initFirebase(callback) {
  var client = getClient();
  if (!client) {
    if (callback) callback('Supabase not loaded');
    return;
  }

  // Check existing session first
  client.auth.getSession().then(function(result) {
    var session = result.data.session;
    if (session) {
      window.__fbUser = { uid: session.user.id, email: session.user.email };
      loadFBData(session.user.id, function(err) {
        fbSubscribe(session.user.id);
        if (callback) callback(err, window.__fbUser);
      });
    } else {
      window.__fbUser = null;
      window.__fbCache = {};
      window.__fbLoaded = false;
      if (callback) callback(null, null);
    }
  }).catch(function(err) {
    console.error('Supabase session check error:', err);
    if (callback) callback(err);
  });

  // Remove previous listener if any
  if (window.__fbAuthListener) {
    try { window.__fbAuthListener.subscription.unsubscribe(); } catch(e) {}
    window.__fbAuthListener = null;
  }

  // Listen for auth changes
  var authResult = client.auth.onAuthStateChange(function(event, session) {
    if (window.__fbRegistering) return;
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      window.__fbUser = { uid: session.user.id, email: session.user.email };
      loadFBData(session.user.id, function() {
        fbSubscribe(session.user.id);
      });
    } else if (event === 'SIGNED_OUT') {
      window.__fbUser = null;
      window.__fbCache = {};
      window.__fbLoaded = false;
      if (window.__fbUnsubscribe) {
        window.__fbUnsubscribe();
        window.__fbUnsubscribe = null;
      }
    }
  });
  window.__fbAuthListener = authResult.data ? authResult.data : authResult;
}

// Load all user data from Supabase into cache (one-time read)
function loadFBData(uid, callback) {
  var client = getClient();
  if (!client) {
    if (callback) callback('Supabase not loaded');
    return;
  }

  client.from('userdata').select('data').eq('id', uid).single()
    .then(function(result) {
      if (result.error) {
        if (result.error.code === 'PGRST116') {
          // No row yet - create one
          window.__fbCache = {};
          window.__fbLoaded = true;
          client.from('userdata').insert({ id: uid, data: {} }).then(function() {
            if (callback) callback();
          }).catch(function(err) {
            console.error('Supabase userdata insert error:', err);
            if (callback) callback(err);
          });
          return;
        }
        console.error('Supabase load error:', result.error);
        if (callback) callback(result.error);
        return;
      }
      var data = result.data.data || {};
      window.__fbCache = data;
      window.__fbLoaded = true;

      var username = data.profile ? data.profile.username : null;
      if (username) syncCacheToLocalStorage(username);

      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Supabase load error:', err);
      if (callback) callback(err);
    });
}

// Set up real-time listener for cross-browser sync
function fbSubscribe(uid, onUpdate) {
  var client = getClient();
  if (!client) return;

  if (window.__fbUnsubscribe) {
    window.__fbUnsubscribe();
    window.__fbUnsubscribe = null;
  }

  // Use Supabase Realtime
  var channel = client.channel('userdata-' + uid)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'userdata', filter: 'id=eq.' + uid },
      function(payload) {
        if (payload.new && payload.new.data) {
          window.__fbCache = payload.new.data;
          window.__fbLoaded = true;
          var username = payload.new.data.profile ? payload.new.data.profile.username : null;
          if (username) syncCacheToLocalStorage(username);
          if (onUpdate) onUpdate(payload.new.data);
          if (window.__fbOnUpdate) window.__fbOnUpdate(payload.new.data);
        }
      }
    )
    .subscribe();

  window.__fbUnsubscribe = function() {
    client.removeChannel(channel);
  };
}

// Sync cached data back to localStorage for offline support
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

// Save data to Supabase (upsert into JSONB data column)
function saveFB(key, data, callback) {
  window.__fbCache[key] = data;
  saveFBFull(callback);
}

function saveFBFull(callback) {
  var client = getClient();
  if (!client) {
    if (callback) callback('Supabase not loaded');
    return;
  }
  if (!window.__fbUser) {
    if (callback) callback('Not authenticated');
    return;
  }
  client.from('userdata').upsert(
    { id: window.__fbUser.uid, data: window.__fbCache, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  )
  .then(function(result) {
    if (result.error) {
      console.error('Supabase save error:', result.error);
      if (callback) callback(result.error);
    } else {
      if (callback) callback();
    }
  })
  .catch(function(err) {
    console.error('Supabase save error:', err);
    if (callback) callback(err);
  });
}

// Set callback for real-time data changes
function fbOnUpdate(callback) {
  window.__fbOnUpdate = callback;
}

// Read from cache
function getFB(key) {
  if (!window.__fbLoaded) return null;
  return window.__fbCache[key];
}

// ==================== SESSION HELPERS ====================

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
// One-time migration from localStorage to Supabase

function migrateLocalStorage(uid, callback) {
  var migrated = {};
  var count = 0;

  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  var session = JSON.parse(localStorage.getItem('session') || 'null');
  var username = session ? session.username : null;

  if (!username) {
    if (callback) callback();
    return;
  }

  var userKeys = keys.filter(function(k) {
    return k.indexOf('tasks_' + username) === 0 ||
           k.indexOf('plans_' + username) === 0 ||
           k.indexOf('milestones_' + username) === 0 ||
           k.indexOf('dailylog_' + username) === 0 ||
           k.indexOf('trips_' + username) === 0 ||
           k.indexOf('it_') === 0 && k.indexOf('_' + username) > 0;
  });

  var flags = keys.filter(function(k) {
    return k === 'welcome_' + username || k === 'tutorial_' + username;
  });

  userKeys.forEach(function(k) {
    try {
      var val = JSON.parse(localStorage.getItem(k));
      if (Array.isArray(val) && val.length > 0) {
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
    var client = getClient();
    if (!client) {
      if (callback) callback('Supabase not loaded');
      return;
    }
    client.from('userdata').upsert(
      { id: uid, data: migrated, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .then(function() {
      console.log('Migrated ' + count + ' localStorage keys to Supabase.');
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

// ==================== SUPABASE AUTH WRAPPERS ====================

function fbLogin(email, password, callback) {
  var client = getClient();
  if (!client) {
    if (callback) callback({ message: 'Supabase not loaded' });
    return;
  }

  client.auth.signInWithPassword({ email: email, password: password })
    .then(function(result) {
      if (result.error) {
        if (callback) callback(result.error);
        return;
      }
      var user = result.data.user;
      window.__fbUser = { uid: user.id, email: user.email };

      // Read profile from Supabase
      client.from('profiles').select('*').eq('id', user.id).single()
        .then(function(pResult) {
          var profile = {};
          if (!pResult.error && pResult.data) {
            profile = {
              username: pResult.data.username,
              name: pResult.data.name,
              email: pResult.data.email,
              isAdmin: pResult.data.is_admin,
              role: pResult.data.role
            };
          }

          // Load userdata into cache
          client.from('userdata').select('data').eq('id', user.id).single()
            .then(function(uResult) {
              if (!uResult.error && uResult.data) {
                window.__fbCache = uResult.data.data || {};
                window.__fbLoaded = true;
              } else {
                window.__fbCache = {};
                window.__fbLoaded = true;
              }

              // Merge local user data
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
                name: profile.name || profile.username || user.email.split('@')[0],
                email: user.email,
                isAdmin: profile.isAdmin || false,
                role: profile.role || 'executive_path',
                supabaseUid: user.id,
                loggedIn: true,
                timestamp: Date.now()
              };
              fbSaveSession(session);

              // Sync profile back to Supabase if mismatch
              var updatedProfile = { username: session.username, name: session.name, email: session.email, isAdmin: session.isAdmin, role: session.role };
              client.from('profiles').upsert({
                id: user.id,
                username: updatedProfile.username,
                name: updatedProfile.name,
                email: updatedProfile.email,
                role: updatedProfile.role,
                is_admin: updatedProfile.isAdmin
              }).catch(function(e) { console.error('Profile sync error:', e); });

              if (callback) callback(null, session);
            })
            .catch(function(err) {
              console.error('Userdata read error:', err);
              var session = {
                username: user.email.split('@')[0],
                name: user.email.split('@')[0],
                email: user.email,
                isAdmin: false,
                role: 'executive_path',
                supabaseUid: user.id,
                loggedIn: true,
                timestamp: Date.now()
              };
              fbSaveSession(session);
              if (callback) callback(null, session);
            });
        })
        .catch(function(err) {
          console.error('Profile read error:', err);
          // Fallback session
          var localUsers = JSON.parse(localStorage.getItem('users') || '[]');
          var localUser = localUsers.find(function(u) { return u.email === user.email; });
          var session = {
            username: user.email.split('@')[0],
            name: user.email.split('@')[0],
            email: user.email,
            isAdmin: localUser ? localUser.isAdmin || false : false,
            role: localUser ? (localUser.role || 'executive_path') : 'executive_path',
            supabaseUid: user.id,
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
  window.__fbRegistering = true;
  var client = getClient();
  if (!client) {
    window.__fbRegistering = false;
    if (callback) callback({ message: 'Supabase not loaded' });
    return;
  }

  client.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        username: profile.username,
        name: profile.name,
        role: profile.role || 'executive_task',
        is_admin: profile.isAdmin || false
      }
    }
  })
  .then(function(result) {
    if (result.error) {
      window.__fbRegistering = false;
      if (callback) callback(result.error);
      return;
    }

    // The trigger handle_new_user() creates profiles + userdata rows automatically.
    // But we also write directly to ensure it's there.
    var uid = result.data.user.id;
    var p = {
      id: uid,
      username: profile.username,
      name: profile.name,
      email: email,
      role: profile.role || 'executive_task',
      is_admin: profile.isAdmin || false
    };
    client.from('profiles').upsert(p, { onConflict: 'id' }).then(function() {
      client.from('userdata').upsert({ id: uid, data: {} }, { onConflict: 'id' }).then(function() {
        localStorage.setItem('welcome_' + profile.username, 'true');

        // Sign out so user must log in
        client.auth.signOut().then(function() {
          window.__fbRegistering = false;
          fbClearSession();
          window.__fbCache = {};
          window.__fbLoaded = false;
          window.__fbUser = null;
          if (callback) callback(null, { username: profile.username, name: profile.name, role: profile.role });
        });
      });
    });
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
  var client = getClient();
  if (!client) {
    if (callback) callback();
    return;
  }
  client.auth.signOut()
    .then(function() {
      if (window.__fbAuthListener) {
        try { window.__fbAuthListener.subscription.unsubscribe(); } catch(e) {}
        window.__fbAuthListener = null;
      }
      if (callback) callback();
    })
    .catch(function(err) {
      if (callback) callback(err);
    });
}
