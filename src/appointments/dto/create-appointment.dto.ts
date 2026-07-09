import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  Matches,
  ArrayMaxSize,
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
  @MaxLength(200)
  fullName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  @MaxLength(20)
  gender!: string;

  @IsString()
  @Matches(/^\+?[0-9\s-]{7,15}$/, { message: 'Enter a valid phone number.' })
  phoneNumber!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsEnum(ServiceType)
  service!: ServiceType;

  @IsDateString()
  preferredDate!: string;

  @IsString()
  @MaxLength(50)
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
  @ArrayMaxSize(20)
  @IsString({ each: true })
  symptoms!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  symptomDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medications?: string;
}
