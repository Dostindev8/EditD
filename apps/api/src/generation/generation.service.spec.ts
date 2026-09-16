import { GenerationService } from "./generation.service.js";
import type { GovernanceService } from "../governance/governance.service.js";
import type { SelfHostedProvider } from "./providers/selfhosted.provider.js";
import type { FreeCloudProvider } from "./providers/free-cloud.provider.js";
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
    freeCloudConfigured?: boolean;
    minimaxConfigured?: boolean;
    muapiConfigured?: boolean;
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

    const freeCloud = {
      name: "free-cloud",
      isConfigured: () => opts.freeCloudConfigured !== false,
    } as unknown as FreeCloudProvider;

    const minimax = {
      name: "minimax",
      isConfigured: () => opts.minimaxConfigured !== false,
    } as unknown as MinimaxProvider;
    const muapi = {
      name: "muapi",
      isConfigured: () => Boolean(opts.muapiConfigured),
    } as unknown as MuapiProvider;
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
      freeCloud,
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

  it("routes free-tier to free-cloud when self-hosted is absent", async () => {
    const service = buildService({ monthlyBudgetCents: 0, selfHostedConfigured: false });
    const result = await service.resolveProviderForWorkspace({ workspaceId: "ws-free" });
    expect(result.provider.name).toBe("free-cloud");
  });

  it("keeps paid providers for workspaces with budget when keys exist", async () => {
    const service = buildService({
      monthlyBudgetCents: 50000,
      selfHostedConfigured: true,
      minimaxConfigured: true,
    });
    const result = await service.resolveProviderForWorkspace({ workspaceId: "ws-paid" });
    expect(result.provider.name).toBe("minimax");
    expect(result.reason).toContain("paid-tier");
  });

  it("falls back to free-cloud on paid tier when no paid keys are configured", async () => {
    const service = buildService({
      monthlyBudgetCents: 50000,
      selfHostedConfigured: false,
      minimaxConfigured: false,
      muapiConfigured: false,
    });
    const result = await service.resolveProviderForWorkspace({
      workspaceId: "ws-paid",
      modality: "image",
      modelId: "flux-dev",
    });
    expect(result.provider.name).toBe("free-cloud");
  });
});
