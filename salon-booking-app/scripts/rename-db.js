const fs = require('fs');
const paths = [
  './server/prisma/dev.db',
  './release/server/prisma/dev.db'
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    const newPath = p.replace('dev.db', 'salonBookingApp.db');
    try {
      fs.renameSync(p, newPath);
      console.log(`Renamed ${p} -> ${newPath}`);
    } catch (err) {
      console.error(`Failed to rename ${p}:`, err.message);
    }
  } else {
    console.log(`Not found: ${p}`);
  }
});
