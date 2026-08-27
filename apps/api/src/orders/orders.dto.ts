import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export enum OutcomeSideDto {
  YES = "YES",
  NO = "NO",
}
export enum OrderSideDto {
  BUY = "BUY",
  SELL = "SELL",
}
export enum OrderTypeDto {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
}

export class PlaceOrderDto {
  @IsString()
  marketId!: string;

  @IsEnum(OutcomeSideDto)
  outcome!: OutcomeSideDto;

  @IsEnum(OrderSideDto)
  side!: OrderSideDto;

  @IsEnum(OrderTypeDto)
  orderType!: OrderTypeDto;

  /** Price in cents of AFR per share (1–99). Required for LIMIT orders. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  priceCents?: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
