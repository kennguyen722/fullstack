const http = require('http');
http.get('http://localhost:4301/api/health', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(d);
    process.exit(0);
  });
}).on('error', e => { console.error('ERR', e.message); process.exit(2); });
