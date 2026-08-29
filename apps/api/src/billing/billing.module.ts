import { Global, Module } from "@nestjs/common";
import { BillingService } from "./billing.service.js";

@Global()
@Module({
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
