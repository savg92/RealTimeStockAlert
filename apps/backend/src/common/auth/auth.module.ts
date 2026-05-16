import { Module } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { PrismaModule } from '../prisma/prisma.module';
import { initializeFirebaseAdminApp } from '../firebase/firebase-admin-app';
import { AuthGuard } from './auth.guard';
import { FIREBASE_ADMIN_AUTH, FirebaseAuthService } from './firebase-auth.service';

const firebaseAdminAuthProvider = {
  provide: FIREBASE_ADMIN_AUTH,
  useFactory: () => {
    const app = initializeFirebaseAdminApp();
    return getAuth(app);
  },
};

@Module({
  imports: [PrismaModule],
  providers: [firebaseAdminAuthProvider, FirebaseAuthService, AuthGuard],
  exports: [FirebaseAuthService, AuthGuard],
})
export class AuthModule {}
