import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Constant-time-ish credential check: bcrypt.compare already runs in
   * constant time relative to the hash: username mismatch and password
   * mismatch return the same generic error, so a caller can't tell which
   * one was wrong.
   */
  async validateAndIssueToken(username: string, password: string): Promise<string> {
    const expectedUsername = this.configService.get('auth.username', { infer: true });
    const passwordHash = this.configService.get('auth.passwordHash', { infer: true });

    if (!expectedUsername || !passwordHash) {
      throw new InternalServerErrorException(
        'AUTH_USERNAME / AUTH_PASSWORD_HASH are not configured on the server.',
      );
    }

    const usernameMatches = username === expectedUsername;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!usernameMatches || !passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.jwtService.sign({ sub: username });
  }
}
