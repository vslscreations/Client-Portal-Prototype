const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createContext() {
  const storage = {};
  const localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    }
  };

  const context = {
    console,
    localStorage,
    window: {},
    document: {}
  };
  context.window = context;
  return { context, localStorage, storage };
}

function loadAveryTools() {
  const { context } = createContext();
  const scriptPath = path.join(__dirname, '..', 'Avery', 'tools.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  vm.createContext(context);
  vm.runInContext(source, context, { filename: scriptPath });
  return context.window.AveryTools;
}

const tools = loadAveryTools();

const sampleRequests = [{
  type: 'Pickup Request',
  status: 'Awaiting Review',
  createdAt: '2026-08-07T10:00:00.000Z',
  customer: { customerName: 'Ada', companyName: 'Northwell' },
  delivery: { pickupAddress: '100 A', deliveryAddress: '200 B', pickupDate: '2026-08-07', pickupTime: '09:00 AM' },
  quote: { estimatedTotal: 120 }
}];

const { context, localStorage } = createContext();
const scriptPath = path.join(__dirname, '..', 'Avery', 'tools.js');
const source = fs.readFileSync(scriptPath, 'utf8');
vm.createContext(context);
vm.runInContext(source, context, { filename: scriptPath });

localStorage.setItem('requests', JSON.stringify(sampleRequests));
localStorage.setItem('avery_customer_profile', JSON.stringify({ firstName: 'Ada', companyName: 'Northwell' }));
localStorage.setItem('avery_saved_routes', JSON.stringify([{ pickupAddress: '100 A', deliveryAddress: '200 B', deliveryType: 'Scheduled Route' }]));

const profile = context.window.AveryTools.getCustomerProfile();
if (!profile || profile.firstName !== 'Ada') {
  throw new Error('Customer profile lookup failed');
}

const routes = context.window.AveryTools.getSavedRoutes();
if (!Array.isArray(routes) || routes.length !== 1) {
  throw new Error('Saved routes lookup failed');
}

const overview = context.window.AveryTools.getBusinessOverview();
if (overview.topCustomer !== 'Northwell') {
  throw new Error('Business overview failed to compute top customer');
}

const quote = context.window.AveryTools.getQuote('missing');
if (quote && quote.hasData) {
  throw new Error('Quote lookup should return an empty state for missing data');
}

console.log('Avery tools tests passed');
