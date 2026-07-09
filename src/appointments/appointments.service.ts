import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './dto/update-status.dto';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

const REFERRALS_BUCKET = 'referrals';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private supabase: SupabaseService,
  ) {}

  private serviceLabels: Record<string, string> = {
    EEG_TEST: 'EEG Test',
    SLEEP_STUDY: 'Sleep Study',
    DEPRESSION_SCREEN: 'Depression Screen',
    OTHER_CONSULTATION: 'Other Consultation',
  };

  async create(dto: CreateAppointmentDto, file?: Express.Multer.File) {
    const dob = new Date(dto.dateOfBirth);
    const preferredDate = new Date(dto.preferredDate);
    const today = new Date(new Date().toDateString());

    if (dob > new Date()) {
      throw new BadRequestException('Date of birth cannot be in the future.');
    }
    if (preferredDate < today) {
      throw new BadRequestException('Preferred date cannot be in the past.');
    }

    let referralFilePath: string | undefined;

    if (file) {
      const ext = file.originalname.split('.').pop();
      const storagePath = `${randomUUID()}.${ext}`;

      const { error } = await this.supabase.client.storage
        .from(REFERRALS_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new BadRequestException('Failed to store referral file.');
      }

      referralFilePath = storagePath; // store the bucket key, not a URL
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        fullName: dto.fullName,
        dateOfBirth: dob,
        gender: dto.gender,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        service: dto.service,
        preferredDate,
        preferredTime: dto.preferredTime,
        symptoms: dto.symptoms,
        symptomDetails: dto.symptomDetails,
        medications: dto.medications,
        referralFilePath,
      },
    });

    try {
      await this.emailService.sendAppointmentConfirmationEmail(
        appointment.email,
        appointment.fullName,
        this.serviceLabels[appointment.service] ?? appointment.service,
        new Date(appointment.preferredDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        appointment.preferredTime,
      );
    } catch (error) {
      console.error('Failed to send appointment confirmation email:', error);
    }

    const { referralFilePath: _omit, ...safeAppointment } = appointment;
    return safeAppointment;
  }

  async getSignedReferralUrl(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }
    if (!appointment.referralFilePath) {
      throw new NotFoundException('This appointment has no referral file.');
    }

    const { data, error } = await this.supabase.client.storage
      .from(REFERRALS_BUCKET)
      .createSignedUrl(appointment.referralFilePath, 60); // expires in 60s

    if (error || !data) {
      throw new BadRequestException('Failed to generate file access link.');
    }

    return { url: data.signedUrl };
  }

  findAll() {
    return this.prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.appointment.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: AppointmentStatus) {
    return this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
  }

  async getStats() {
    const [total, pending, confirmed, completed, cancelled] = await Promise.all(
      [
        this.prisma.appointment.count(),
        this.prisma.appointment.count({ where: { status: 'PENDING' } }),
        this.prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
        this.prisma.appointment.count({ where: { status: 'COMPLETED' } }),
        this.prisma.appointment.count({ where: { status: 'CANCELLED' } }),
      ],
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.prisma.appointment.count({
      where: {
        preferredDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      today: todayCount,
    };
  }
}
