import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ApiException");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Internal server error";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message) ? (b.message as string[]).join("; ") : String(b.message ?? exception.message);
        if (typeof b.code === "string") code = b.code;
        if (b.details) details = b.details;
      }
      if (code === "INTERNAL_ERROR") {
        code =
          status === 400 ? "BAD_REQUEST"
          : status === 401 ? "UNAUTHORIZED"
          : status === 403 ? "FORBIDDEN"
          : status === 404 ? "NOT_FOUND"
          : status === 409 ? "CONFLICT"
          : status === 429 ? "RATE_LIMITED"
          : "HTTP_ERROR";
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ success: false, error: { code, message, details } });
  }
}

/** Helper to throw domain errors with a stable machine-readable code. */
export class DomainException extends HttpException {
  constructor(code: string, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message }, status);
  }
}
