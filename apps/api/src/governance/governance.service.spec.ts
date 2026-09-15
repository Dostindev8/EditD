import { GovernanceService } from "./governance.service.js";
import type { BillingService } from "../billing/billing.service.js";
import type { Model } from "mongoose";
import type { WorkspaceDocument } from "../workspaces/workspace.schema.js";

describe("GovernanceService.evaluateBudget", () => {
  const billing = {
    workspaceSpendCents: jest.fn(),
  } as unknown as BillingService;

  const workspaces = {
    findById: jest.fn(),
  } as unknown as Model<WorkspaceDocument>;

  const service = new GovernanceService(billing, workspaces);

  beforeEach(() => {
    jest.clearAllMocks();
    (workspaces.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve({ monthlyBudgetCents: 10000 }),
    });
  });

  it("rejects when workspace spend + estimate exceeds budget", async () => {
    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(9500);
    const result = await service.evaluateBudget({
      workspaceId: "ws1",
      estimatedCostCents: 1000,
    });
    expect(result.allowed).toBe(false);
    expect(result.alert).toBe("90");
    expect(result.remainingCents).toBe(500);
  });

  it("allows when there is enough remaining budget", async () => {
    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(2000);
    const result = await service.evaluateBudget({
      workspaceId: "ws1",
      estimatedCostCents: 1500,
    });
    expect(result.allowed).toBe(true);
    expect(result.spentCents).toBe(2000);
    expect(result.remainingCents).toBe(8000);
    expect(result.alert).toBe("ok");
  });

  it("raises alert thresholds at 70/90/100%", async () => {
    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(7000);
    const a70 = await service.evaluateBudget({ workspaceId: "ws1", estimatedCostCents: 100 });
    expect(a70.alert).toBe("70");

    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(9000);
    const a90 = await service.evaluateBudget({ workspaceId: "ws1", estimatedCostCents: 100 });
    expect(a90.alert).toBe("90");

    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(10000);
    const a100 = await service.evaluateBudget({ workspaceId: "ws1", estimatedCostCents: 100 });
    expect(a100.alert).toBe("100");
    expect(a100.allowed).toBe(false);
  });

  it("rejects zero-cost generation when a paid workspace is exhausted", async () => {
    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(10000);
    const result = await service.evaluateBudget({
      workspaceId: "ws1",
      estimatedCostCents: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.freeTier).toBe(true);
  });

  it("allows zero-cost generation on free-tier workspaces (budget ≤ threshold)", async () => {
    (workspaces.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve({ monthlyBudgetCents: 0 }),
    });
    (billing.workspaceSpendCents as jest.Mock).mockResolvedValue(0);
    const result = await service.evaluateBudget({
      workspaceId: "ws-free",
      estimatedCostCents: 0,
    });
    expect(result.allowed).toBe(true);
  });
});
