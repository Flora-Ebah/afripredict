import { Type } from "class-transformer";
import {
  IsDate, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength,
} from "class-validator";

export class CreateMarketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  eventTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @Type(() => Date)
  @IsDate()
  closeAt!: Date;

  @Type(() => Date)
  @IsDate()
  resolutionAt!: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  resolutionCriteria!: string;

  @IsString()
  @IsNotEmpty()
  resolutionSource!: string;

  @IsOptional()
  @IsString()
  fallbackSource?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}

export class ResolveMarketDto {
  @IsIn(["YES", "NO"])
  outcome!: "YES" | "NO";

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export enum AdminUserAction {
  SUSPEND = "SUSPEND",
  UNSUSPEND = "UNSUSPEND",
  RESET_BALANCE = "RESET_BALANCE",
}

export class AdminUserActionDto {
  @IsEnum(AdminUserAction)
  action!: AdminUserAction;

  @IsOptional()
  @IsString()
  role?: string;
}
