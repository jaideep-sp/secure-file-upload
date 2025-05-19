import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for ${loginDto.email}`);
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.logger.warn(
        `Failed login for ${loginDto.email}: Invalid credentials`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { email: user.email, sub: user.id };
    this.logger.log(
      `User ${user.email} (ID: ${user.id}) logged in successfully.`,
    );
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
