import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    let database = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return { status: database === "up" ? "ok" : "degraded", database, uptime: process.uptime() };
  }
}
