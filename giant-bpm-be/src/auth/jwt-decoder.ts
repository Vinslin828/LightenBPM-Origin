import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdToken } from './types/id-token';

@Injectable()
export class JwtDecoder {
  constructor(private readonly jwtService: JwtService) {}

  decode(token: string): IdToken {
    const decoded: IdToken = this.jwtService.decode<IdToken>(token);
    return decoded;
  }
}
