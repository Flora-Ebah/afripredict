import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma.module";
import { WsModule } from "./ws/ws.module";
import { AuthModule } from "./auth/auth.module";
import { MarketsModule } from "./markets/markets.module";
import { OrdersModule } from "./orders/orders.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { SocialModule } from "./social/social.module";
import { AdminModule } from "./admin/admin.module";
import { AiModule } from "./ai/ai.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    WsModule,
    AuthModule,
    MarketsModule,
    OrdersModule,
    PortfolioModule,
    SocialModule,
    AdminModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
