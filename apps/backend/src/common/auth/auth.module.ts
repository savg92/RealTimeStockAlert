import { Module, UnauthorizedException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { PrismaModule } from '../prisma/prisma.module';
import { initializeFirebaseAdminApp } from '../firebase/firebase-admin-app';
import { AuthGuard } from './auth.guard';
import { FIREBASE_ADMIN_AUTH, FirebaseAuthService } from './firebase-auth.service';

const firebaseAdminAuthProvider = {
  provide: FIREBASE_ADMIN_AUTH,
  useFactory: () => {
    try {
      const app = initializeFirebaseAdminApp();
      return getAuth(app);
    } catch (err) {
      // If Firebase admin cannot be initialized, return a stub that will
      // throw Unauthorized when verifyIdToken is called. This avoids crashing
      // the Nest app at startup while keeping behavior explicit at runtime.
      return {
        verifyIdToken: async (): Promise<any> => {
          throw new UnauthorizedException('Firebase admin is not configured');
        },
      };
    }
  },
};

@Module({
  imports: [PrismaModule],
  providers: [firebaseAdminAuthProvider, FirebaseAuthService, AuthGuard],
  exports: [FirebaseAuthService, AuthGuard],
})
export class AuthModule {}
