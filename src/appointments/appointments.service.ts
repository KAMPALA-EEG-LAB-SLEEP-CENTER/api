import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAppointmentDto, referralFile?: Express.Multer.File) {
    return this.prisma.appointment.create({
      data: {
        fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        service: dto.service,
        preferredDate: new Date(dto.preferredDate),
        preferredTime: dto.preferredTime,
        symptoms: dto.symptoms,
        symptomDetails: dto.symptomDetails,
        medications: dto.medications,
        referralFilePath: referralFile?.path,
      },
    });
  }
  findAll() {
    return this.prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.appointment.findUnique({ where: { id } });
  }
}
