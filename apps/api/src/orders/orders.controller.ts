import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OrdersService } from "./orders.service";
import { PlaceOrderDto } from "./orders.dto";
import { JwtAuthGuard } from "../common/guards";
import { AuthUser, CurrentUser } from "../common/decorators";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  place(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    return this.orders.placeOrder(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("status") status?: string) {
    return this.orders.listOrders(user.id, status);
  }

  @Get(":id")
  view(@Param("id") id: string) {
    return this.orders.orderView(id);
  }

  @Delete(":id")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.cancelOrder(user.id, id);
  }
}
