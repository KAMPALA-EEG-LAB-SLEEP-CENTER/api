import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ServiceType {
  EEG_TEST = 'EEG_TEST',
  SLEEP_STUDY = 'SLEEP_STUDY',
  DEPRESSION_SCREEN = 'DEPRESSION_SCREEN',
  OTHER_CONSULTATION = 'OTHER_CONSULTATION',
}

export class CreateAppointmentDto {
  @IsString()
  fullName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  gender!: string;

  @IsString()
  phoneNumber!: string;

  @IsEmail()
  email!: string;

  @IsEnum(ServiceType)
  service!: ServiceType;

  @IsDateString()
  preferredDate!: string;

  @IsString()
  preferredTime!: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  symptoms!: string[];

  @IsOptional()
  @IsString()
  symptomDetails?: string;

  @IsOptional()
  @IsString()
  medications?: string;
}
