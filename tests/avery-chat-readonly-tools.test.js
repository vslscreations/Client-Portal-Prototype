const assert = require('node:assert/strict');

const {
  lookupToolDefinitions,
  allowedToolTables,
  validateToolTableName,
  validateToolRequest,
  applyAuthenticatedBusinessScope,
  assertNoBusinessIdOverride,
  resolveOperationalWindow,
  validateStatusValue,
  validateWindowValue,
  CLIENT_CONTEXT,
  OWNER_EMPLOYEE_CONTEXT,
  resolveAdaContext,
  getAllowedToolsForContext,
  buildOpenAIToolDefinitionsForContext,
  CLIENT_ADA_SYSTEM_PROMPT,
  OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT
} = require('../supabase/functions/avery-chat/tools.cjs');

assert.ok(lookupToolDefinitions.lookup_pickup);
assert.equal(lookupToolDefinitions.lookup_pickup.table, 'pickup_requests');
assert.equal(lookupToolDefinitions.lookup_quote.table, 'quotes');
assert.equal(lookupToolDefinitions.get_business_info.table, 'businesses');
assert.ok(lookupToolDefinitions.list_scheduled_pickups);
assert.ok(lookupToolDefinitions.list_pickups_by_status);
assert.ok(lookupToolDefinitions.list_pickups_by_driver);
assert.ok(lookupToolDefinitions.get_next_pickup);
assert.ok(lookupToolDefinitions.list_unscheduled_pickups);
assert.ok(allowedToolTables.has('pickup_requests'));
assert.ok(allowedToolTables.has('quotes'));
assert.ok(allowedToolTables.has('businesses'));

assert.throws(() => {
  validateToolTableName('users');
}, /Invalid table name/i);

assert.throws(() => {
  validateToolRequest('lookup_pickup', {
    business_id: '11111111-1111-4111-8111-111111111111',
    tracking_number: 'DL-123'
  });
}, /does not accept business_id/i);

assert.throws(() => {
  validateToolRequest('lookup_pickup', {
    malicious: 'true'
  });
}, /does not allow the field "malicious"/i);

assert.throws(() => {
  validateToolRequest('lookup_quote', {
    tracking_number: 'DL-123'
  });
}, /does not allow the field "tracking_number"/i);

const pickup = validateToolRequest('lookup_pickup', {
  tracking_number: 'DL-123'
});
assert.deepEqual(pickup.filters, {
  tracking_number: 'DL-123'
});

const quote = validateToolRequest('lookup_quote', {
  reference: 'Q-20260810-00001'
});
assert.deepEqual(quote.filters, {
  reference: 'Q-20260810-00001'
});

const business = validateToolRequest('get_business_info', {});
assert.deepEqual(business.filters, {});

const scheduled = validateToolRequest('list_scheduled_pickups', {
  window: 'today',
  driver_name: 'John'
});
assert.deepEqual(scheduled.filters, {
  window: 'today',
  driver_name: 'John'
});

const statusFiltered = validateToolRequest('list_pickups_by_status', {
  status: 'Awaiting Dispatch',
  window: 'tomorrow'
});
assert.deepEqual(statusFiltered.filters, {
  status: 'Awaiting Dispatch',
  window: 'tomorrow'
});

const driverLookup = validateToolRequest('list_pickups_by_driver', {
  driver_name: 'John',
  status: 'Active',
  window: 'this_week'
});
assert.deepEqual(driverLookup.filters, {
  driver_name: 'John',
  status: 'Active',
  window: 'this_week'
});

const nextPickup = validateToolRequest('get_next_pickup', {
  window: 'future'
});
assert.deepEqual(nextPickup.filters, {
  window: 'future'
});

const unscheduled = validateToolRequest('list_unscheduled_pickups', {
  window: 'all'
});
assert.deepEqual(unscheduled.filters, {
  window: 'all'
});

assert.throws(() => {
  validateToolRequest('list_pickups_by_status', { status: 'Unknown' });
}, /Invalid status/i);

assert.throws(() => {
  validateToolRequest('list_scheduled_pickups', { window: 'not-a-window' });
}, /Invalid operational window/i);

const scopedPickup = applyAuthenticatedBusinessScope('lookup_pickup', pickup.filters, '11111111-1111-4111-8111-111111111111');
assert.deepEqual(scopedPickup, {
  tracking_number: 'DL-123',
  business_id: '11111111-1111-4111-8111-111111111111'
});

assert.throws(() => {
  applyAuthenticatedBusinessScope('lookup_pickup', pickup.filters, 'not-a-valid-uuid');
}, /requires an authenticated user's business_id/i);

assert.throws(() => {
  assertNoBusinessIdOverride('lookup_pickup', { business_id: '11111111-1111-4111-8111-111111111111', tracking_number: 'DL-123' });
}, /does not accept business_id/i);

const anotherBusinessPickup = applyAuthenticatedBusinessScope('lookup_pickup', { tracking_number: 'DL-123' }, '22222222-2222-4222-8222-222222222222');
assert.equal(anotherBusinessPickup.business_id, '22222222-2222-4222-8222-222222222222');
assert.equal(anotherBusinessPickup.tracking_number, 'DL-123');

const missingPickup = applyAuthenticatedBusinessScope('lookup_pickup', { tracking_number: 'NOT-FOUND-TRACKING' }, '33333333-3333-4333-8333-333333333333');
assert.equal(missingPickup.tracking_number, 'NOT-FOUND-TRACKING');

const resolvedToday = resolveOperationalWindow('today', new Date('2026-08-12T12:00:00Z'));
assert.equal(resolvedToday.start, '2026-08-12');
assert.equal(resolvedToday.end, '2026-08-12');

const resolvedTomorrow = resolveOperationalWindow('tomorrow', new Date('2026-08-12T12:00:00Z'));
assert.equal(resolvedTomorrow.start, '2026-08-13');
assert.equal(resolvedTomorrow.end, '2026-08-13');

const resolvedWeek = resolveOperationalWindow('this_week', new Date('2026-08-12T12:00:00Z'));
assert.equal(resolvedWeek.start, '2026-08-10');
assert.equal(resolvedWeek.end, '2026-08-16');

assert.equal(validateStatusValue('Completed'), 'Completed');
assert.equal(validateWindowValue('today'), 'today');
assert.equal(validateWindowValue('this_week'), 'this_week');

assert.equal(CLIENT_CONTEXT, 'client');
assert.equal(OWNER_EMPLOYEE_CONTEXT, 'owner_employee');
assert.equal(resolveAdaContext('client'), 'client');
assert.equal(resolveAdaContext('owner_employee'), 'owner_employee');
assert.equal(resolveAdaContext('OWNER_EMPLOYEE'), 'owner_employee');
assert.equal(resolveAdaContext(undefined), 'client');

const clientToolNames = getAllowedToolsForContext('client');
const ownerToolNames = getAllowedToolsForContext('owner_employee');

assert.ok(clientToolNames.includes('lookup_pickup'));
assert.ok(!clientToolNames.includes('list_scheduled_pickups'));
assert.ok(!clientToolNames.includes('list_unscheduled_pickups'));
assert.ok(!clientToolNames.includes('list_pickups_by_driver'));
assert.ok(!clientToolNames.includes('list_pickups_by_status'));
assert.ok(ownerToolNames.includes('lookup_pickup'));
assert.ok(ownerToolNames.includes('list_scheduled_pickups'));
assert.ok(ownerToolNames.includes('list_unscheduled_pickups'));
assert.ok(ownerToolNames.includes('list_pickups_by_driver'));
assert.ok(ownerToolNames.includes('list_pickups_by_status'));

const clientTools = buildOpenAIToolDefinitionsForContext('client');
const ownerTools = buildOpenAIToolDefinitionsForContext('owner_employee');
assert.ok(clientTools.some((tool) => tool.function.name === 'lookup_pickup'));
assert.ok(!clientTools.some((tool) => tool.function.name === 'list_scheduled_pickups'));
assert.ok(ownerTools.some((tool) => tool.function.name === 'list_scheduled_pickups'));
assert.ok(ownerTools.some((tool) => tool.function.name === 'list_unscheduled_pickups'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('lookup_pickup'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('When an authenticated client asks about a specific tracking number, use lookup_pickup.'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('restricted to the authenticated client\'s business'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('Do not tell the client that specific pickup lookups are unavailable.'));
assert.ok(!CLIENT_ADA_SYSTEM_PROMPT.includes('internal dispatch schedule'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('725-444-4358'));
assert.ok(CLIENT_ADA_SYSTEM_PROMPT.includes('internal dispatch'));
assert.ok(OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT.includes('scheduled_pickup_date'));
assert.ok(OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT.includes('assigned_driver'));

assert.ok(validateToolRequest('lookup_pickup', { tracking_number: 'DL-123' }));
assert.throws(() => {
  validateToolRequest('lookup_pickup', { tracking_number: 'DL-123', business_id: '11111111-1111-4111-8111-111111111111' });
}, /does not accept business_id/i);
assert.deepEqual(applyAuthenticatedBusinessScope('lookup_pickup', { tracking_number: 'DL-123' }, '11111111-1111-4111-8111-111111111111'), {
  tracking_number: 'DL-123',
  business_id: '11111111-1111-4111-8111-111111111111'
});
assert.equal(getAllowedToolsForContext('client').includes('lookup_pickup'), true);
assert.equal(getAllowedToolsForContext('client').includes('list_scheduled_pickups'), false);
assert.equal(getAllowedToolsForContext('owner_employee').includes('list_pickups_by_driver'), true);

console.log('read-only tool validation tests passed');
