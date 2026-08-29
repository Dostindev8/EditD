import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { LoginDto, RegisterDto } from "./auth.dto.js";
import { JwtGuard } from "./jwt.guard.js";
import { CurrentUser } from "./current-user.decorator.js";
import type { AccessPayload } from "./jwt.guard.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private auth: AuthService) {}

  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post("register")
  register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(body.email, body.password, body.name, res);
  }

  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @Post("login")
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body.email, body.password, res);
  }

  @Post("refresh")
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.cookies?.lcs_refresh, res);
  }

  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.lcs_refresh, res);
  }

  @UseGuards(JwtGuard)
  @Post("revoke")
  revoke(@CurrentUser() user: AccessPayload, @Res({ passthrough: true }) res: Response) {
    return this.auth.revokeAll(user.sub, res);
  }

  @UseGuards(JwtGuard)
  @Get("me")
  me(@CurrentUser() user: AccessPayload) {
    return this.auth.me(user.sub);
  }
}
