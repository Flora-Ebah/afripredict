import {
  Body, Controller, Delete, Get, Param, Post, Query, UseGuards,
} from "@nestjs/common";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { SocialService } from "./social.service";
import { JwtAuthGuard } from "../common/guards";
import { AuthUser, CurrentUser } from "../common/decorators";

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

@Controller()
export class SocialController {
  constructor(private social: SocialService) {}

  // --- comments ---
  @Get("markets/:id/comments")
  comments(@Param("id") marketId: string, @Query("limit") limit?: string) {
    return this.social.listComments(marketId, limit ? Number(limit) : undefined);
  }

  @Post("markets/:id/comments")
  @UseGuards(JwtAuthGuard)
  addComment(@CurrentUser() user: AuthUser, @Param("id") marketId: string, @Body() dto: CreateCommentDto) {
    return this.social.addComment(user.id, marketId, dto.content);
  }

  @Delete("comments/:id")
  @UseGuards(JwtAuthGuard)
  deleteComment(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.social.deleteComment(user, id);
  }

  // --- watchlist ---
  @Get("watchlist")
  @UseGuards(JwtAuthGuard)
  watchlist(@CurrentUser() user: AuthUser) {
    return this.social.listWatchlist(user.id);
  }

  @Post("markets/:id/watch")
  @UseGuards(JwtAuthGuard)
  watch(@CurrentUser() user: AuthUser, @Param("id") marketId: string) {
    return this.social.toggleWatch(user.id, marketId);
  }

  // --- notifications ---
  @Get("notifications")
  @UseGuards(JwtAuthGuard)
  notifications(@CurrentUser() user: AuthUser, @Query("unread") unread?: string) {
    return this.social.listNotifications(user.id, unread === "true");
  }

  @Post("notifications/read")
  @UseGuards(JwtAuthGuard)
  markRead(@CurrentUser() user: AuthUser) {
    return this.social.markAllRead(user.id);
  }

  // --- leaderboard ---
  @Get("leaderboard")
  leaderboard(@Query("period") period?: "daily" | "weekly" | "monthly" | "all") {
    return this.social.leaderboard(period ?? "all");
  }
}
