var fs = require('fs');
var path = require('path');

var DB_DIR = path.join(__dirname, 'database');
var USERNAME = 'joseph_diala';
var FULL_NAME = 'Joseph Diala';

// --- SQL Parser ---
function extractRows(str, rows) {
  var depth = 0, inString = false, escape = false, start = -1;
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === "'" && !escape) { inString = !inString; continue; }
    if (inString) continue;
    if (c === '(') { if (depth === 0) start = i; depth++; }
    else if (c === ')') { depth--; if (depth === 0 && start !== -1) { rows.push(str.substring(start + 1, i)); start = -1; } }
  }
}

function parseValues(str) {
  var fields = [], current = '', inString = false, escape = false;
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (escape) { current += c; escape = false; continue; }
    if (c === '\\') { escape = true; current += c; continue; }
    if (c === "'" && inString) { inString = false; continue; }
    if (c === "'" && !inString) { inString = true; continue; }
    if (c === ',' && !inString) { fields.push(current.trim()); current = ''; continue; }
    current += c;
  }
  if (current.trim()) fields.push(current.trim());
  return fields.map(function(f) {
    f = f.trim();
    if (f === 'NULL') return null;
    if (f.charAt(0) === "'" && f.charAt(f.length - 1) === "'") return f.slice(1, -1);
    if (f.match(/^\d+$/)) return parseInt(f, 10);
    return f;
  });
}

function parseSQL(filePath) {
  var sql = fs.readFileSync(filePath, 'utf8');
  var rows = [];
  var blocks = sql.split(/;\s*\n/);
  blocks.forEach(function(block) {
    block = block.trim();
    if (!block || !/^INSERT\s+INTO/i.test(block)) return;
    var vi = block.toUpperCase().indexOf('VALUES');
    if (vi === -1) return;
    extractRows(block.substring(vi + 6), rows);
  });
  return rows.map(parseValues);
}

// --- Transform Functions ---
var now = Date.now();
var seq = 0;
function uid() { return now + (seq++); }

var statusMapAcc = { pending: 'pending', completed: 'completed' };
var statusMapMS = { pending: 'pending', in_progress: 'in-progress', completed: 'completed', cancelled: 'cancelled' };
var statusMapInv = { active: 'active', inactive: 'inactive', maintenance: 'maintenance', disposed: 'disposed' };
var catMapInv = { computer: 'Computer', laptop: 'Laptop', printer: 'Printer', monitor: 'Monitor', network_device: 'Network Device', software: 'Software', other: 'Other' };
var sevMap = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
var statusMapSvc = { open: 'open', investigating: 'in-progress', resolved: 'resolved', closed: 'closed' };
var catMapSvc = { 'Technical Support': 'General', Network: 'Network', Hardware: 'Other' };

// Read all data files
var dja = parseSQL(path.join(DB_DIR, 'daily_job_accomplishments.sql'));
var ir = parseSQL(path.join(DB_DIR, 'incident_reports.sql'));
var ic = parseSQL(path.join(DB_DIR, 'inspection_checklists.sql'));
var ii = parseSQL(path.join(DB_DIR, 'it_inventory.sql'));
var itx = parseSQL(path.join(DB_DIR, 'inventory_transactions.sql'));
var ms = parseSQL(path.join(DB_DIR, 'maintenance_schedules.sql'));
var ann = parseSQL(path.join(DB_DIR, 'announcements.sql'));

// Build incident index for cross-referencing accomplishments
var incidentIndex = {};
ir.forEach(function(row) {
  var id = row[0];
  if (id) incidentIndex[id] = {
    title: row[3] || '',
    requestor_name: row[15] || '',
    severity: row[6] || 'medium',
    department: row[16] || '',
    incident_date: row[11] || '',
    resolution: row[10] || ''
  };
});

// --- Build import data structure ---
var crypto = require('crypto');
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

var DEFAULT_PASSWORD = sha256('joseph');

var data = {
  exportedAt: new Date().toISOString(),
  users: [
    { username: USERNAME, name: FULL_NAME, email: 'joseph@kalyx.com', password: DEFAULT_PASSWORD, isAdmin: false, role: 'executive_it' }
  ]
};

// 1. IT Services (from incident_reports)
var services = [];
ir.forEach(function(row) {
  var type = row[5] || 'Technical Support';
  services.push({
    id: uid(), createdAt: Date.now(),
    name: row[3] || '',
    requestorName: row[15] || '',
    severity: sevMap[row[6]] || 'Medium',
    category: catMapSvc[type] || 'General',
    department: row[16] || '',
    incidentDate: row[11] || '',
    cost: '',
    description: row[4] || '',
    resolution: row[10] || '',
    status: statusMapSvc[row[7]] || 'open',
    accomplishmentId: null
  });
});
services.sort(function(a, b) { return (a.incidentDate || '') > (b.incidentDate || '') ? -1 : (a.incidentDate || '') < (b.incidentDate || '') ? 1 : 0; });
data['it_services_' + USERNAME] = services;

// 2. Daily Job Accomplishments (from daily_job_accomplishments)
var accomplishments = [];
dja.forEach(function(row) {
  var cat = row[3] || 'Other';
  var incId = row[4];
  var obj = {
    id: uid(), createdAt: Date.now(),
    category: cat,
    description: row[5] || '',
    date: row[2] || '',
    status: statusMapAcc[row[6]] || 'pending',
    title: ''
  };
  if (cat === 'Technical Support' && incId && incidentIndex[incId]) {
    var inc = incidentIndex[incId];
    obj.reportTitle = inc.title || '';
    obj.requestorName = inc.requestor_name || '';
    obj.severity = (inc.severity || 'medium').charAt(0).toUpperCase() + (inc.severity || 'medium').slice(1);
    obj.department = inc.department || '';
    obj.incidentDate = inc.incident_date || '';
    obj.resolution = inc.resolution || '';
  }
  accomplishments.push(obj);
});
data['it_accomplishments_' + USERNAME] = accomplishments;

// 3. IT Inventory (from it_inventory + inventory_transactions as movements)
var inventoryItems = [];
var itemMap = {};
ii.forEach(function(row) {
  var type = row[3] || 'other';
  var item = {
    id: uid(), createdAt: Date.now(),
    name: row[2] || '',
    category: catMapInv[type] || 'Other',
    brand: row[4] || '', model: row[5] || '',
    serial: row[6] || '', assetTag: row[7] || '',
    location: row[8] || '', department: row[9] || '',
    status: statusMapInv[row[10]] || 'active',
    assignedTo: row[13] || '',
    quantity: row[15] || 0,
    purchaseDate: row[11] || '',
    warrantyExpiry: row[12] || '',
    notes: row[14] || '',
    movements: []
  };
  inventoryItems.push(item);
  var origId = row[0];
  if (origId) itemMap[origId] = item;
});

// Attach inventory transactions as movements
itx.forEach(function(row) {
  var itemId = row[1];
  var item = itemMap[itemId];
  if (item) {
    item.movements.push({
      date: row[6] ? String(row[6]).substring(0, 10) : '',
      type: row[3] === 'in' ? 'in' : 'out',
      qty: row[4] || 0,
      reference: '',
      person: FULL_NAME,
      notes: row[5] || '',
      timestamp: Date.now()
    });
    // Update quantity based on movement
    if (row[3] === 'in') item.quantity += (row[4] || 0);
    else if (row[3] === 'out') item.quantity = Math.max(0, (item.quantity || 0) - (row[4] || 0));
  }
});
data['it_inventory_' + USERNAME] = inventoryItems;

// 4. Tasks (from maintenance_schedules as tasks, and also create it_task_ entries)
var taskStatusMap = { pending: 'todo', in_progress: 'in-progress', completed: 'done', cancelled: 'cancelled' };
var tasks = [];
ms.forEach(function(row) {
  tasks.push({
    id: uid(), createdAt: Date.now(),
    title: 'Maintenance: ' + (row[2] || 'Equipment'),
    description: (row[6] || '') + (row[10] ? '\nRemarks: ' + row[10] : ''),
    dueDate: row[3] || '',
    dueTime: '',
    priority: 'medium',
    assignedTo: row[5] || FULL_NAME,
    status: taskStatusMap[row[9]] || 'todo'
  });
});
data['it_task_' + USERNAME] = tasks;

// 5. Maintenance records (from maintenance_schedules + inspection_checklists)
function quarterFromDate(d) {
  if (!d || d.length < 7) return '';
  var m = parseInt(d.substring(5, 7), 10);
  if (m >= 1 && m <= 3) return 'Q1 (Jan - Mar)';
  if (m >= 4 && m <= 6) return 'Q2 (Apr - Jun)';
  if (m >= 7 && m <= 9) return 'Q3 (Jul - Sep)';
  if (m >= 10 && m <= 12) return 'Q4 (Oct - Dec)';
  return '';
}
function matchPeriod(raw) {
  if (!raw) return '';
  var map = { 'Q1': 'Q1 (Jan - Mar)', 'Q2': 'Q2 (Apr - Jun)', 'Q3': 'Q3 (Jul - Sep)', 'Q4': 'Q4 (Oct - Dec)' };
  return map[raw] || raw;
}
var maintenance = [];
ms.forEach(function(row) {
  var equipName = row[2] || 'Other Equipment';
  var dateStr = row[3] || '';
  maintenance.push({
    id: uid(), createdAt: Date.now(),
    equipment: equipName,
    title: equipName + ' Maintenance',
    inspectionDate: dateStr, scheduledDate: dateStr,
    reference: 'ITDF-01', frequency: 'Quarterly', period: quarterFromDate(dateStr),
    brand: '', model: '', serial: '',
    description: (row[6] || '') + (row[10] ? '\nRemarks: ' + row[10] : ''),
    inspectedBy: row[5] || '', checkedBy: '',
    status: statusMapMS[row[9]] || 'pending',
    asset: equipName,
    checks: { checkParts: false, cleanInteriors: false, operatingCondition: false, electricalWires: false }
  });
});
ic.forEach(function(row) {
  var type = row[4] || 'other';
  var equipName = row[6] || (type === 'photocopier' ? 'Photocopier' : type === 'printer' ? 'Printer' : 'Equipment');
  var modelStr = row[7] || '';
  var displayName = equipName;
  if (modelStr) {
    if (modelStr.indexOf(equipName) === 0) displayName = modelStr;
    else displayName = equipName + ' ' + modelStr;
  }
  maintenance.push({
    id: uid(), createdAt: Date.now(),
    equipment: displayName,
    title: displayName + ' Inspection',
    inspectionDate: row[3] || '', scheduledDate: row[3] || '',
    reference: row[2] || 'ITDF-01', frequency: row[5] || 'Quarterly', period: matchPeriod(row[35]) || '',
    brand: equipName, model: modelStr, serial: row[8] || '',
    description: row[36] || '',
    inspectedBy: row[25] || '', checkedBy: row[26] || '',
    status: 'completed',
    asset: displayName,
    checks: {
      checkParts: !!(row[31]),
      cleanInteriors: !!(row[32]),
      operatingCondition: !!(row[33]),
      electricalWires: !!(row[34])
    }
  });
});
data['it_maintenance_' + USERNAME] = maintenance;

// 6. Announcements (reference only)
data.announcements = ann.map(function(row) {
  return {
    id: row[0] || 0,
    title: row[1] || '',
    message: row[2] || '',
    announcement_type: row[3] || 'info',
    created_at: row[4] || '',
    expires_at: row[5] || '',
    is_active: row[6] === 1 || row[6] === '1'
  };
});

// --- Generate JSON output ---
var outPath = path.join(__dirname, 'joseph_diala_import.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

// --- Also generate individual JSON files for each key (for manual localStorage setting) ---
var outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

var keys = Object.keys(data);
keys.forEach(function(key) {
  if (key === 'exportedAt') return;
  fs.writeFileSync(path.join(outDir, key + '.json'), JSON.stringify(data[key], null, 2), 'utf8');
});

// --- Print summary ---
console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║         MIGRATION COMPLETE                          ║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log('║  User: ' + (FULL_NAME + ' (' + USERNAME + ')').padEnd(44) + '║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log('║  Keys generated:                                    ║');
Object.keys(data).forEach(function(key) {
  if (key === 'exportedAt' || key === 'users') return;
  if (key === 'announcements') return;
  var count = Array.isArray(data[key]) ? data[key].length : '?';
  console.log('║    ' + ('it_' + key.replace('it_', '').replace(USERNAME, '') + ' → ' + key.padEnd(36)).padEnd(52) + '║');
  console.log('║      Records: ' + String(count).padEnd(43) + '║');
});
console.log('╠══════════════════════════════════════════════════════╣');
console.log('║  Total records: ' + String(Object.keys(data).filter(function(k) { return k !== 'exportedAt' && k !== 'users' && Array.isArray(data[k]); }).reduce(function(sum, k) { return sum + data[k].length; }, 0)).padEnd(43) + '║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log('║  Generated files:                                   ║');
console.log('║    1. Kalyxbackup/joseph_diala_import.json          ║');
console.log('║       → Import via Admin Panel > Data Management     ║');
console.log('║                                                     ║');
console.log('║    2. Kalyxbackup/output/*.json                     ║');
console.log('║       → Individual key files for manual import      ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log('NEXT STEP: Open the Admin Panel (admin/index.html),');
console.log('go to Data Management, click Import Data,');
console.log('and select "Kalyxbackup/joseph_diala_import.json".');
console.log('');
console.log('Then log in as: ' + USERNAME + ' (use the default IT password)');
