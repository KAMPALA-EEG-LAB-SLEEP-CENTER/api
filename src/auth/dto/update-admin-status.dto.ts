import { IsEnum } from 'class-validator';

export enum AdminStatusValue {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export class UpdateAdminStatusDto {
  @IsEnum(AdminStatusValue)
  status!: AdminStatusValue;
}
