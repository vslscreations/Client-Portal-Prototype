const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard.html'), 'utf8');
const scriptSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');

assert(!html.includes('ownerClientSearch'), 'Dashboard should not render a search bar for the client table');
assert(html.includes('ownerClientDetailModal'), 'Dashboard should include a read-only client detail modal');
assert(html.includes('ownerClientActivityChart'), 'Dashboard should include a scrollable client activity chart');
assert(scriptSource.includes('fetchOwnerClientDirectory'), 'Owner client data loader is missing');
assert(scriptSource.includes('renderOwnerClientDirectory'), 'Owner client renderer is missing');
assert(scriptSource.includes('buildOwnerClientActivityChart'), 'Owner client activity chart builder is missing');
assert(scriptSource.includes('return getOwnerClientDemoDirectory();') === false, 'Owner client directory must not silently fall back to demo data for a missing business association');
assert(scriptSource.includes('String(userResult.data.role || "").toLowerCase() !== "owner"'), 'Owner dashboard must validate the active user role before loading client data');

console.log('Owner client directory checks passed');
