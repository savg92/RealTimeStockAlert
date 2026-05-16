import { Module } from '@nestjs/common';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { AuthModule } from '../common/auth/auth.module';
import { initializeFirebaseAdminApp } from '../common/firebase/firebase-admin-app';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { FIREBASE_ADMIN_MESSAGING } from './notifications.tokens';

const firebaseAdminMessagingProvider = {
  provide: FIREBASE_ADMIN_MESSAGING,
  useFactory: (): Messaging | null => {
    const notificationsEnabled = process.env.FIREBASE_ENABLE_MESSAGING !== 'false';
    if (!notificationsEnabled) {
      return null;
    }

    try {
      const app = initializeFirebaseAdminApp();
      return getMessaging(app);
    } catch {
      return null;
    }
  },
};

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [firebaseAdminMessagingProvider, NotificationService],
  controllers: [NotificationsController],
  exports: [NotificationService],
})
export class NotificationsModule {}
