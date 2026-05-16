import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { FirebaseAuthService } from './firebase-auth.service';

describe('AuthGuard', () => {
  const authService = {
    verifyTokenAndSyncUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the request has no bearer token', async () => {
    const guard = new AuthGuard(authService as unknown as FirebaseAuthService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user to the request', async () => {
    authService.verifyTokenAndSyncUser.mockResolvedValue({
      id: 'user-1',
      firebaseId: 'firebase-uid',
      email: 'user@example.com',
      name: 'Test User',
    });

    const guard = new AuthGuard(authService as unknown as FirebaseAuthService);
    const request: {
      headers: { authorization: string };
      user?: {
        id: string;
        firebaseId: string;
        email: string;
        name: string;
      };
    } = {
      headers: {
        authorization: 'Bearer token-123',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.verifyTokenAndSyncUser).toHaveBeenCalledWith('token-123');
    expect(request.user).toEqual({
      id: 'user-1',
      firebaseId: 'firebase-uid',
      email: 'user@example.com',
      name: 'Test User',
    });
  });
});
