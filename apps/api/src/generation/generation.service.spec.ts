import { GenerationService } from "./generation.service.js";
import type { GovernanceService } from "../governance/governance.service.js";
import type { SelfHostedProvider } from "./providers/selfhosted.provider.js";
import type { DevMockProvider } from "./providers/dev-mock.provider.js";
import type { MinimaxProvider } from "./providers/minimax.provider.js";
import type { MuapiProvider } from "./providers/muapi.provider.js";
import type { RunwayProvider } from "./providers/runway.provider.js";
import type { VeoProvider } from "./providers/veo.provider.js";
import type { LipSyncProvider } from "./providers/lipsync.provider.js";
import type { AudioProvider } from "./providers/audio.provider.js";

describe("GenerationService.resolveProviderForWorkspace", () => {
  function buildService(opts: {
    monthlyBudgetCents: number;
    selfHostedConfigured: boolean;
  }) {
    const governance = {
      getWorkspaceMonthlyBudgetCents: jest.fn().mockResolvedValue(opts.monthlyBudgetCents),
      isFreeTierBudget: jest.fn((cents: number) => cents <= 0),
      freeTierBudgetThresholdCents: jest.fn().mockReturnValue(0),
    } as unknown as GovernanceService;

    const selfHosted = {
      name: "self-hosted",
      isConfigured: () => opts.selfHostedConfigured,
    } as unknown as SelfHostedProvider;

    const minimax = {
      name: "minimax",
      isConfigured: () => true,
    } as unknown as MinimaxProvider;
    const muapi = { name: "muapi", isConfigured: () => false } as unknown as MuapiProvider;
    const runway = { name: "runway", isConfigured: () => false } as unknown as RunwayProvider;
    const veo = { name: "veo", isConfigured: () => false } as unknown as VeoProvider;
    const lipsync = { name: "lipsync", isConfigured: () => true } as unknown as LipSyncProvider;
    const audio = { name: "audio", isConfigured: () => true } as unknown as AudioProvider;
    const devMock = { name: "dev-mock", isConfigured: () => true } as unknown as DevMockProvider;

    const service = new GenerationService(
      {} as never,
      {} as never,
      governance,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      runway,
      veo,
      muapi,
      minimax,
      lipsync,
      audio,
      selfHosted,
      devMock,
    );

    return service;
  }

  it("routes free-tier workspaces to self-hosted when configured", async () => {
    const service = buildService({ monthlyBudgetCents: 0, selfHostedConfigured: true });
    const result = await service.resolveProviderForWorkspace({ workspaceId: "ws-free" });
    expect(result.freeTier).toBe(true);
    expect(result.provider.name).toBe("self-hosted");
    expect(result.reason).toContain("free-tier");
  });

  it("keeps paid providers for workspaces with budget", async () => {
    const service = buildService({ monthlyBudgetCents: 50000, selfHostedConfigured: true });
    const result = await service.resolveProviderForWorkspace({ workspaceId: "ws-paid" });
    expect(result.freeTier).toBe(false);
    expect(result.provider.name).toBe("minimax");
    expect(result.reason).toContain("paid-tier");
  });
});
