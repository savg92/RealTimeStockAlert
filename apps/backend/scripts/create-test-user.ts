import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
if (!credentialsJson) {
  console.error('FIREBASE_ADMIN_CREDENTIALS not found in .env');
  process.exit(1);
}

const credentials = JSON.parse(credentialsJson);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: credentials.project_id,
  });
}

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const displayName = 'Test User';

  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`User already exists: ${user.uid}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      console.log(`Created new test user: ${newUser.uid}`);
    } else {
      console.error('Error checking user:', error);
    }
  }
}

createTestUser().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
