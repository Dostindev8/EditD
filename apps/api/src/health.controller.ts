import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

@Controller("health")
export class HealthController {
  @SkipThrottle()
  @Get()
  ok() {
    return { ok: true, service: "lcs-dominican-api", phase: 0 };
  }
}
