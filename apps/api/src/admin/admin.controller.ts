import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AdminService } from "./admin.service";
import { AdminUserActionDto, CreateMarketDto, ResolveMarketDto } from "./admin.dto";
import { JwtAuthGuard, RolesGuard } from "../common/guards";
import { AuthUser, CurrentUser, Roles } from "../common/decorators";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("markets")
  markets(@Query("page") page?: string) {
    return this.admin.marketsAdmin(page ? Number(page) : 1);
  }

  @Post("markets")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MARKET_CREATOR)
  createMarket(@CurrentUser() user: AuthUser, @Body() dto: CreateMarketDto) {
    return this.admin.createMarket(user.id, dto);
  }

  @Post("markets/:id/close")
  closeMarket(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.admin.closeMarket(user.id, id);
  }

  @Post("markets/:id/resolve")
  resolveMarket(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ResolveMarketDto) {
    return this.admin.resolveMarket(user.id, id, dto);
  }

  @Post("markets/:id/cancel")
  cancelMarket(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.admin.cancelMarket(user.id, id);
  }

  @Get("users")
  users(@Query("search") search?: string, @Query("page") page?: string) {
    return this.admin.listUsers(search, page ? Number(page) : 1);
  }

  @Post("users/:id/action")
  userAction(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AdminUserActionDto) {
    return this.admin.userAction(user.id, id, dto.action, dto.role);
  }

  @Get("audit-logs")
  auditLogs(@Query("page") page?: string) {
    return this.admin.auditLogs(page ? Number(page) : 1);
  }
}
