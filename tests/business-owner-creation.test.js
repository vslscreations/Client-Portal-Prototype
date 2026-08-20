const assert = require('assert');
const path = require('path');

const helperPath = path.join(__dirname, '..', 'js', 'business-owner-creation.js');
const {
  validateBusinessOwnerInput,
  validateClientAccountInput,
  isPlatformAdminRole,
  isOwnerRole,
  isClientRole
} = require(helperPath);

const validBusinessPayload = {
  businessName: 'Test Business A',
  ownerName: 'Jane Owner',
  ownerEmail: 'jane.owner@example.com'
};

const validClientPayload = {
  firstName: 'Taylor',
  lastName: 'Client',
  email: 'taylor.client@example.com',
  phone: '555-123-4567',
  username: 'taylor.client',
  temporaryPassword: 'TempPass123!',
  confirmTemporaryPassword: 'TempPass123!'
};

const invalidBusinessPayloads = [
  { ...validBusinessPayload, businessName: '' },
  { ...validBusinessPayload, ownerName: '' },
  { ...validBusinessPayload, ownerEmail: 'not-an-email' },
  { ...validBusinessPayload, ownerEmail: '' }
];

const invalidClientPayloads = [
  { ...validClientPayload, firstName: '' },
  { ...validClientPayload, email: '' },
  { ...validClientPayload, email: 'not-an-email' }
];

assert.deepStrictEqual(validateBusinessOwnerInput(validBusinessPayload), {
  ok: true,
  values: {
    businessName: 'Test Business A',
    ownerName: 'Jane Owner',
    ownerEmail: 'jane.owner@example.com'
  }
});

assert.deepStrictEqual(validateClientAccountInput(validClientPayload), {
  ok: true,
  values: {
    firstName: 'Taylor',
    lastName: 'Client',
    email: 'taylor.client@example.com',
    phone: '555-123-4567',
    username: 'taylor.client',
    temporaryPassword: 'TempPass123!',
    confirmTemporaryPassword: 'TempPass123!'
  }
});

for (const payload of invalidBusinessPayloads) {
  const result = validateBusinessOwnerInput(payload);
  assert.strictEqual(result.ok, false, `expected business validation failure for payload ${JSON.stringify(payload)}`);
  assert.ok(Array.isArray(result.errors));
}

for (const payload of invalidClientPayloads) {
  const result = validateClientAccountInput(payload);
  assert.strictEqual(result.ok, false, `expected client validation failure for payload ${JSON.stringify(payload)}`);
  assert.ok(Array.isArray(result.errors));
}

assert.strictEqual(isPlatformAdminRole('admin'), true);
assert.strictEqual(isPlatformAdminRole('owner'), false);
assert.strictEqual(isOwnerRole('owner'), true);
assert.strictEqual(isOwnerRole('client'), false);
assert.strictEqual(isClientRole('client'), true);

console.log('Business owner and client validation tests passed');
