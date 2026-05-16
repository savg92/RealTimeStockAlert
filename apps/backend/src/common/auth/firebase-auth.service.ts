import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, FirebaseUserTokenClaims } from '@stock-alert/shared';
import { PrismaService } from '../prisma/prisma.service';

export const FIREBASE_ADMIN_AUTH = 'FIREBASE_ADMIN_AUTH';

export interface FirebaseAdminAuth {
  verifyIdToken(token: string): Promise<FirebaseUserTokenClaims>;
}

@Injectable()
export class FirebaseAuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FIREBASE_ADMIN_AUTH)
    private readonly firebaseAuth: FirebaseAdminAuth,
  ) {}

  async verifyTokenAndSyncUser(idToken: string): Promise<AuthenticatedUser> {
    try {
      const decoded = await this.firebaseAuth.verifyIdToken(idToken);

      if (!decoded?.uid || !decoded?.email) {
        throw new UnauthorizedException('Invalid Firebase token payload');
      }

      const user = await this.prisma.user.upsert({
        where: { firebaseId: decoded.uid },
        create: {
          firebaseId: decoded.uid,
          email: decoded.email,
          name: decoded.name ?? null,
        },
        update: {
          email: decoded.email,
          name: decoded.name ?? null,
        },
      });

      return {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      throw error instanceof UnauthorizedException
        ? error
        : new UnauthorizedException('Firebase token verification failed');
    }
  }
}
