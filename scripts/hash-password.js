#!/usr/bin/env node
/* Generates a bcrypt hash to paste into AUTH_PASSWORD_HASH in .env.
 * Usage: npm run hash-password -- "your-strong-password"
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your-strong-password"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log('\nAdd this line to your .env:\n');
  console.log(`AUTH_PASSWORD_HASH=${hash}\n`);
});
