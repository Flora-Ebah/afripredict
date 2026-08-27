import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { MarketsService } from "./markets.service";
import { OptionalJwtAuthGuard } from "../common/guards";
import { AuthUser, CurrentUser } from "../common/decorators";

@Controller("markets")
export class MarketsController {
  constructor(private markets: MarketsService) {}

  @Get()
  list(
    @Query("category") category?: string,
    @Query("country") country?: string,
    @Query("region") region?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("sort") sort?: "trending" | "new" | "ending_soon" | "volume",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.markets.list({
      category,
      country,
      region,
      status,
      search,
      sort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":idOrSlug")
  @UseGuards(OptionalJwtAuthGuard)
  detail(@Param("idOrSlug") idOrSlug: string, @CurrentUser() user?: AuthUser) {
    return this.markets.detail(idOrSlug, user?.id);
  }

  @Get(":id/orderbook")
  orderbook(@Param("id") id: string, @Query("outcome") outcome?: "YES" | "NO") {
    return this.markets.orderbook(id, outcome === "NO" ? "NO" : "YES");
  }

  @Get(":id/trades")
  trades(@Param("id") id: string, @Query("limit") limit?: string) {
    return this.markets.trades(id, limit ? Number(limit) : undefined);
  }

  @Get(":id/history")
  history(@Param("id") id: string, @Query("interval") interval?: "1H" | "1D" | "1W" | "1M" | "ALL") {
    return this.markets.priceHistory(id, interval ?? "ALL");
  }
}
