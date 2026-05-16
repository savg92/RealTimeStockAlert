import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FirebaseAuthService, FIREBASE_ADMIN_AUTH } from './firebase-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FirebaseAuthService', () => {
  const verifyIdToken = jest.fn();
  const prisma = {
    user: {
      upsert: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies the Firebase token and syncs the user profile', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid',
      email: 'user@example.com',
      name: 'Test User',
    });
    prisma.user.upsert.mockResolvedValue({
      id: 'user-1',
      firebaseId: 'firebase-uid',
      email: 'user@example.com',
      name: 'Test User',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        FirebaseAuthService,
        { provide: FIREBASE_ADMIN_AUTH, useValue: { verifyIdToken } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    const service = moduleRef.get(FirebaseAuthService);

    await expect(service.verifyTokenAndSyncUser('token-123')).resolves.toEqual({
      id: 'user-1',
      firebaseId: 'firebase-uid',
      email: 'user@example.com',
      name: 'Test User',
    });

    expect(verifyIdToken).toHaveBeenCalledWith('token-123');
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { firebaseId: 'firebase-uid' },
      create: {
        firebaseId: 'firebase-uid',
        email: 'user@example.com',
        name: 'Test User',
      },
      update: {
        email: 'user@example.com',
        name: 'Test User',
      },
    });
  });

  it('throws UnauthorizedException when token verification fails', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        FirebaseAuthService,
        { provide: FIREBASE_ADMIN_AUTH, useValue: { verifyIdToken } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    const service = moduleRef.get(FirebaseAuthService);

    await expect(service.verifyTokenAndSyncUser('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
