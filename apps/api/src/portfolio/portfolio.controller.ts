import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { JwtAuthGuard } from "../common/guards";
import { AuthUser, CurrentUser } from "../common/decorators";

@Controller("portfolio")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private portfolio: PortfolioService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.portfolio.summary(user.id);
  }

  @Get("positions")
  positions(@CurrentUser() user: AuthUser) {
    return this.portfolio.positions(user.id);
  }

  @Get("activity")
  activity(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.portfolio.activity(user.id, limit ? Number(limit) : undefined);
  }

  @Get("trades")
  trades(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.portfolio.tradeHistory(user.id, limit ? Number(limit) : undefined);
  }
}
