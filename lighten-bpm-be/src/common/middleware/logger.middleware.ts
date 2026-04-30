import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, headers } = req;
    const body: unknown = req.body;
    const query = req.query;
    const params = req.params;

    // Log incoming request
    this.logger.log(
      `${method} ${originalUrl} | Body: ${JSON.stringify(body)} | Query: ${JSON.stringify(query)} | Params: ${JSON.stringify(params)} | User-Agent: ${headers['user-agent'] || 'unknown'}`,
    );

    next();
  }
}
