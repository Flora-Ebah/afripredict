import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "./decorators";
import { DomainException } from "./api-exception.filter";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

/** Like JwtAuthGuard but lets anonymous requests through (req.user stays undefined). */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new DomainException("UNAUTHORIZED", "Authentication required", HttpStatus.UNAUTHORIZED);
    if (!required.includes(user.role)) {
      throw new DomainException("FORBIDDEN", "Insufficient role", HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
