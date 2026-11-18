/**
 * Give a Firebase Auth user the admin claim the BackOffice app needs.
 *   npm run set-admin -- someone@example.com        (add)
 *   npm run set-admin -- someone@example.com --off  (remove)
 * Create the user first: Firebase console → Authentication → Users → Add user.
 */
import { initAdmin } from './firebase-admin.js';

const email = process.argv[2];
const off = process.argv.includes('--off');
if (!email) { console.error('Usage: npm run set-admin -- <email> [--off]'); process.exit(1); }

async function main() {
  const auth = initAdmin().auth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, off ? {} : { admin: true });
  console.log(`✓ ${email} ${off ? 'is no longer' : 'is now'} an admin. Sign out and in again in the app.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
