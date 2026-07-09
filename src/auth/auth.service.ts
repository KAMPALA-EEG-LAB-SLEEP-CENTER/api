import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    if (admin.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'This account has been suspended or deactivated. Please contact a super admin.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
    return {
      accessToken: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async listAdmins() {
    return this.prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      return {
        message: 'If that email is registered, a reset code has been sent.',
      };
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { code, adminId: admin.id, expiresAt },
    });

    await this.emailService.sendOtpEmail(admin.email, admin.name, code);

    return {
      message: 'If that email is registered, a reset code has been sent.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (!admin) throw new BadRequestException('Invalid or expired code');

    const otp = await this.prisma.otpCode.findFirst({
      where: { adminId: admin.id, code: dto.code, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (!admin) throw new BadRequestException('Invalid or expired code');

    const otp = await this.prisma.otpCode.findFirst({
      where: { adminId: admin.id, code: dto.code, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      }),
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Password reset successfully. You can now log in.' };
  }

  async addAdmin(dto: AddAdminDto) {
    const existing = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException('An admin with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    try {
      await this.emailService.sendWelcomeEmail(
        admin.email,
        admin.name,
        dto.password,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the whole request if the email fails — the admin account is still created successfully.
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new UnauthorizedException('Admin not found');

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      admin.password,
    );
    if (!passwordValid)
      throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully.' };
  }

  async updateAdminStatus(
    requestingAdminId: string,
    targetAdminId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED',
  ) {
    if (requestingAdminId === targetAdminId) {
      throw new BadRequestException(
        'You cannot change your own account status.',
      );
    }

    const target = await this.prisma.admin.findUnique({
      where: { id: targetAdminId },
    });
    if (!target) throw new BadRequestException('Admin not found');

    if (target.role === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Cannot change the status of another super admin.',
      );
    }

    const updated = await this.prisma.admin.update({
      where: { id: targetAdminId },
      data: { status },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
    };
  }
}
