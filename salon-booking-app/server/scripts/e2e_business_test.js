const http = require('http');
const assert = require('assert');

function req(path, method='GET', body, token) {
  const opts = {
    hostname: '127.0.0.1',
    port: 4301,
    path,
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const r = http.request(opts, (res) => {
      let d=''; res.on('data', c => d+=c);
      res.on('end', () => {
        try { const json = d ? JSON.parse(d) : null; resolve({ status: res.statusCode, body: json }); } catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', (e) => reject(e));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async function(){
  try {
    console.log('Logging in as SUPER...');
    const login = await req('/api/auth/login','POST',{ email: process.env.SUPERADMIN_EMAIL || 'super@salon.local', password: process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!' });
    console.log('login:', login.status, login.body && login.body.token ? 'token received' : JSON.stringify(login.body));
    if (!login.body || !login.body.token) throw new Error('Login failed');
    const token = login.body.token;

    console.log('Creating test business...');
    const create = await req('/api/businesses','POST',{ name: 'E2E Test Biz', email: 'e2e@biz.local' }, token);
    console.log('create:', create.status, create.body);

    console.log('Listing businesses...');
    const list = await req('/api/businesses','GET',null, token);
    console.log('list:', list.status, Array.isArray(list.body) ? `${list.body.length} businesses` : JSON.stringify(list.body));
  } catch (err) {
    console.error('E2E error:', err);
    process.exit(2);
  }
})();
