import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";
import { LoginDto, RegisterDto } from "./auth.dto";

const INITIAL_BONUS_CENTS = 10_000 * 100;
const REFRESH_TTL_MS = 7 * 24 * 3600 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sha256(v: string) {
    return createHash("sha256").update(v).digest("hex");
  }

  private async issueTokens(user: { id: string; email: string; username: string; role: string }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, username: user.username, role: user.role },
      { secret: process.env.JWT_SECRET ?? "dev-secret", expiresIn: process.env.JWT_ACCESS_TTL ?? "900s" },
    );
    const refreshToken = randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }] },
    });
    if (existing) {
      throw new DomainException("USER_EXISTS", "Email or username already in use", HttpStatus.CONFLICT);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.serializableTx(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          username: dto.username,
          displayName: dto.displayName?.trim() || dto.username,
          passwordHash,
          country: dto.country?.toUpperCase(),
        },
      });
      const wallet = await tx.wallet.create({
        data: { userId: created.id, balanceCents: INITIAL_BONUS_CENTS },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: created.id,
          walletId: wallet.id,
          type: "INITIAL_BONUS",
          amountCents: INITIAL_BONUS_CENTS,
          balanceBeforeCents: 0,
          balanceAfterCents: INITIAL_BONUS_CENTS,
          referenceType: "SIGNUP",
        },
      });
      await tx.notification.create({
        data: {
          userId: created.id,
          type: "SYSTEM",
          title: "Bienvenue sur AFRIPREDICT 🎉",
          message: "Votre compte démo est crédité de 10 000 AFR (crédits virtuels, simulation).",
        },
      });
      return created;
    });

    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new DomainException("INVALID_CREDENTIALS", "Invalid email or password", HttpStatus.UNAUTHORIZED);
    }
    if (user.status !== "ACTIVE") {
      throw new DomainException("ACCOUNT_SUSPENDED", "Account is suspended", HttpStatus.FORBIDDEN);
    }
    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const hash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new DomainException("INVALID_REFRESH_TOKEN", "Refresh token invalid or expired", HttpStatus.UNAUTHORIZED);
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new DomainException("ACCOUNT_UNAVAILABLE", "Account unavailable", HttpStatus.UNAUTHORIZED);
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    const hash = this.sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new DomainException("NOT_FOUND", "User not found", HttpStatus.NOT_FOUND);
    return {
      ...this.publicUser(user),
      wallet: user.wallet
        ? {
            currency: user.wallet.currency,
            balance: user.wallet.balanceCents / 100,
            lockedBalance: user.wallet.lockedCents / 100,
          }
        : null,
    };
  }

  publicUser(u: {
    id: string; email: string; username: string; displayName: string;
    avatarUrl: string | null; country: string | null; role: string; createdAt: Date;
  }) {
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      country: u.country,
      role: u.role,
      createdAt: u.createdAt,
    };
  }
}
