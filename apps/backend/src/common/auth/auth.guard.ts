import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '@stock-alert/shared';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly firebaseAuthService: FirebaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string>; user?: AuthenticatedUser }>();
    const authorization = request.headers?.authorization ?? request.headers?.Authorization;
    const token = this.extractBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException('Missing Firebase bearer token');
    }

    // Development mode: accept dev-test token for mobile testing
    if (process.env.NODE_ENV === 'development' && token === 'dev-test-token-12345') {
      request.user = {
        id: 'dev-user-1',
        firebaseId: 'dev-firebase-id-1',
        email: 'dev@test.local',
        name: 'Development Test User',
      };
      return true;
    }

    request.user = await this.firebaseAuthService.verifyTokenAndSyncUser(token);
    return true;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}

