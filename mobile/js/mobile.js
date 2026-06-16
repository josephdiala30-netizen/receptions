var mobileApp = {
  session: null,
  currentView: 'dashboard',
  currentSection: null,

  init: function() {
    var session = fbGetSession();
    if (!session || !session.loggedIn) {
      window.location.href = '../login/';
      return;
    }
    this.session = session;
    document.getElementById('user-avatar').textContent = (session.name || session.username || '?')[0].toUpperCase();
    document.getElementById('user-name').textContent = session.name || session.username;
    document.getElementById('user-email').textContent = session.email || '';
    var titleEl = document.getElementById('portal-title');
    if (titleEl) titleEl.textContent = titleEl.dataset.title || 'Portal';

    this.registerSW();
    this.setupInstallPrompt();

    var savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') this.enableDarkMode();

    initFirebase(function(err, user) {
      if (err) { console.error(err); return; }
      if (!user) { window.location.href = '../login/'; return; }
      fbOnUpdate(function(data) {
        if (mobileApp.onDataUpdate) mobileApp.onDataUpdate(data);
      });
      if (mobileApp.onReady) mobileApp.onReady();
    });
  },

  enableDarkMode: function() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  },

  disableDarkMode: function() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  },

  toggleTheme: function() {
    if (document.body.classList.contains('dark-mode')) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  },

  switchView: function(view) {
    this.currentView = view;
    document.querySelectorAll('.view-section').forEach(function(el) { el.style.display = 'none'; });
    var target = document.getElementById('view-' + view);
    if (target) {
      target.style.display = 'block';
      target.querySelectorAll('.fade-in').forEach(function(el, i) {
        el.style.animationDelay = (i * 0.05) + 's';
      });
    }
    document.querySelectorAll('.bottom-nav-item').forEach(function(el) {
      el.classList.toggle('active', el.dataset.view === view);
    });
    this.closeMoreMenu();
    if (this.onViewChange) this.onViewChange(view);
  },

  toggleMoreMenu: function() {
    var overlay = document.getElementById('more-menu');
    if (!overlay) return;
    overlay.classList.toggle('open');
  },

  closeMoreMenu: function() {
    var overlay = document.getElementById('more-menu');
    if (overlay) overlay.classList.remove('open');
  },

  openModal: function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal: function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  showToast: function(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() { el.classList.remove('show'); }, 2500);
  },

  goTo: function(path) {
    window.location.href = '../' + path + '/';
  },

  doLogout: function() {
    fbLogout(function() {
      window.location.href = '../login/';
    });
  },

  formatDate: function(d) {
    if (!d) return '';
    var date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatTime: function(d) {
    if (!d) return '';
    var date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  },

  timeAgo: function(d) {
    if (!d) return '';
    var now = Date.now();
    var ts = typeof d === 'number' ? d : new Date(d).getTime();
    if (isNaN(ts)) return '';
    var diff = now - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return this.formatDate(d);
  },

  escapeHtml: function(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  },

  today: function() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  genId: function() {
    return Date.now() + Math.floor(Math.random() * 1000);
  },

  getStatusIcon: function(status) {
    var icons = {
      'open': 'radio_button_unchecked',
      'todo': 'radio_button_unchecked',
      'pending': 'radio_button_unchecked',
      'scheduled': 'schedule',
      'in-progress': 'hourglass_top',
      'progress': 'hourglass_top',
      'resolved': 'check_circle',
      'done': 'check_circle',
      'completed': 'check_circle',
      'closed': 'cancel',
      'active': 'play_circle',
      'cancelled': 'cancel'
    };
    return icons[status] || 'radio_button_unchecked';
  },

  getPriorityColor: function(p) {
    var map = { 'low': 'low', 'medium': 'medium', 'high': 'high', 'Critical': 'Critical', 'High': 'high', 'Medium': 'medium', 'Low': 'low' };
    return map[p] || 'low';
  },

  registerSW: function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function(reg) {
        console.log('SW registered:', reg.scope);
      }).catch(function(err) {
        console.log('SW registration failed:', err);
      });
    }
  },

  setupInstallPrompt: function() {
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      var btn = document.getElementById('install-btn');
      if (btn) { btn.style.display = 'flex'; }
    });
    window.installApp = function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result) {
          if (result.outcome === 'accepted') {
            var btn = document.getElementById('install-btn');
            if (btn) btn.style.display = 'none';
          }
          deferredPrompt = null;
        });
      }
    };
  },

  onReady: null,
  onDataUpdate: null,
  onViewChange: null
};
