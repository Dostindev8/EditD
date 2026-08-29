import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingService } from "../billing/billing.service.js";
import { Workspace, WorkspaceDocument } from "../workspaces/workspace.schema.js";

export type BudgetAlert = "ok" | "70" | "90" | "100";

export type BudgetEvaluation = {
  allowed: boolean;
  remainingCents: number;
  budgetCents: number;
  spentCents: number;
  estimatedCostCents: number;
  alert: BudgetAlert;
  freeTier: boolean;
  reason: string;
};

@Injectable()
export class GovernanceService {
  constructor(
    @Inject(BillingService) private billing: BillingService,
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
  ) {}

  estimateGenerationCostCents(durationSec: number, aspectRatio: string): number {
    const base = Number(process.env.GENERATION_COST_CENTS_PER_SEC ?? 8);
    const ratioMultiplier =
      aspectRatio === "16:9" ? 1.2 : aspectRatio === "1:1" ? 1 : 0.9;
    return Math.max(50, Math.round(durationSec * base * ratioMultiplier));
  }

  async evaluateBudget(input: {
    workspaceId: string;
    estimatedCostCents: number;
    locale?: "es" | "en";
  }): Promise<BudgetEvaluation> {
    const locale = input.locale ?? "es";
    const ws = await this.workspaces.findById(input.workspaceId).lean();
    const budget = ws?.monthlyBudgetCents ?? 50000;
    const spent = await this.billing.workspaceSpendCents(input.workspaceId);
    const estimate = input.estimatedCostCents;
    const remaining = budget - spent;
    const ratio = budget > 0 ? spent / budget : 1;

    let alert: BudgetAlert = "ok";
    if (ratio >= 1) alert = "100";
    else if (ratio >= 0.9) alert = "90";
    else if (ratio >= 0.7) alert = "70";

    const freeTier = estimate === 0;
    const allowed = freeTier || spent + estimate <= budget;

    let reason: string;
    if (!allowed) {
      reason =
        locale === "es"
          ? "El presupuesto de este workspace está agotado. Amplía el límite mensual para generar video con IA."
          : "This workspace budget is exhausted. Increase the monthly limit to generate AI video.";
    } else if (freeTier) {
      reason =
        locale === "es"
          ? "Plan gratuito: puedes explorar opciones de video sin costo."
          : "Free plan: explore video directions at no cost.";
    } else if (alert === "90") {
      reason =
        locale === "es"
          ? `Atención: has usado más del 90% del presupuesto. Quedan ${(remaining / 100).toFixed(2)} USD.`
          : `Warning: over 90% of budget used. ${(remaining / 100).toFixed(2)} USD remaining.`;
    } else if (alert === "70") {
      reason =
        locale === "es"
          ? `Has usado más del 70% del presupuesto. Quedan ${(remaining / 100).toFixed(2)} USD.`
          : `Over 70% of budget used. ${(remaining / 100).toFixed(2)} USD remaining.`;
    } else {
      reason =
        locale === "es"
          ? `Presupuesto disponible: ${(remaining / 100).toFixed(2)} USD restantes.`
          : `Budget available: ${(remaining / 100).toFixed(2)} USD remaining.`;
    }

    return {
      allowed,
      remainingCents: remaining,
      budgetCents: budget,
      spentCents: spent,
      estimatedCostCents: estimate,
      alert,
      freeTier,
      reason,
    };
  }
}
