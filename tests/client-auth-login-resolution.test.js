const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync(require('path').join(__dirname, '..', 'js', 'client-auth.js'), 'utf8');

function createAuthHarness(options = {}) {
  const sessionStorage = {};
  const calls = [];

  const from = () => ({
    select: () => ({
      ilike: (column, value) => ({
        maybeSingle: async () => {
          calls.push({ column, value });
          if (options.usernameMatch && value === options.usernameMatch) {
            return { data: { id: 'user-1', email: options.email, username: options.username }, error: null };
          }
          return { data: null, error: null };
        }
      })
    })
  });

  const context = {
    console,
    document: { documentElement: { style: {} } },
    location: {
      pathname: '/client-login.html',
      href: 'http://localhost:5500/client-login.html',
      origin: 'http://localhost:5500',
      replace: () => {}
    },
    sessionStorage: {
      getItem: (key) => sessionStorage[key] || null,
      setItem: (key, value) => { sessionStorage[key] = value; },
      removeItem: (key) => { delete sessionStorage[key]; }
    },
    supabaseClient: {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => {}
      },
      from
    }
  };

  context.window = context;
  context.global = context;

  vm.runInNewContext(code, context);
  return { auth: context.window.DasherLabClientAuth, calls };
}

(async () => {
  const harness = createAuthHarness({
    username: 'trace.check',
    email: 'trace.check@example.com',
    usernameMatch: 'trace.check'
  });

  const result = await harness.auth.resolveClientEmailFromUsername('Trace Check');
  assert.strictEqual(result, 'trace.check@example.com', 'username lookup should normalize spaces and accept the same username format as account creation');

  const emailHarness = createAuthHarness({
    username: 'trace.check',
    email: 'trace.check@example.com',
    usernameMatch: 'trace.check'
  });

  const emailResult = await emailHarness.auth.resolveClientEmailFromUsername('trace.check@example.com');
  assert.strictEqual(emailResult, 'trace.check@example.com', 'email input should be accepted directly as a login identifier');

  const staleAppMetadataHarness = createAuthHarness({
    username: 'trace.check',
    email: 'trace.check@example.com',
    usernameMatch: 'trace.check'
  });

  const staleAppMetadataResult = staleAppMetadataHarness.auth.hasPasswordChangeRequired({
    app_metadata: { requires_password_change: true, needs_password_change: true },
    user_metadata: { requires_password_change: false, needs_password_change: false }
  });
  assert.strictEqual(staleAppMetadataResult, false, 'user_metadata should take precedence after the client completes first-login setup');

  console.log('Client auth login resolution tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
