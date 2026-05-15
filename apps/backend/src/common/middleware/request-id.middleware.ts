import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || this.generateRequestId();
    
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    
    next();
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
