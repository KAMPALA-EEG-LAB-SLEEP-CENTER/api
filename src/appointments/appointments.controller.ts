import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { verifyBufferMagicBytes } from '../common/utils/verify-file-magic-bytes';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @UseInterceptors(
    FileInterceptor('referralFile', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMime.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only PDF, JPG, or PNG files are allowed.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const detectedMime = await verifyBufferMagicBytes(file.buffer);
      if (!detectedMime) {
        throw new BadRequestException(
          'The uploaded file does not appear to be a valid PDF, JPG, or PNG.',
        );
      }
    }

    return this.appointmentsService.create(createAppointmentDto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats() {
    return this.appointmentsService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/referral-url')
  getReferralUrl(@Param('id') id: string) {
    return this.appointmentsService.getSignedReferralUrl(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.appointmentsService.updateStatus(id, dto.status);
  }
}
