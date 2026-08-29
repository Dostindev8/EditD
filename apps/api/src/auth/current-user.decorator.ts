import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AccessPayload } from "./jwt.guard.js";

export const CurrentUser = createParamDecorator((_d: unknown, ctx: ExecutionContext): AccessPayload => {
  return ctx.switchToHttp().getRequest().user;
});
