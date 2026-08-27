import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
