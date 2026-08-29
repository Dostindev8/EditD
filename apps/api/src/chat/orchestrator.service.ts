import { Inject, Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { BillingService } from "../billing/billing.service.js";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Workspace, WorkspaceDocument } from "../workspaces/workspace.schema.js";
import { CreatorService } from "../creator/creator.service.js";
import { GenerationService } from "../generation/generation.service.js";
import { GovernanceService } from "../governance/governance.service.js";
import type { VideoOption } from "../creator/creator.types.js";

const TOOLS = [
  {
    name: "check_budget_and_policy",
    description: "Mandatory before generation. Returns budget status.",
    input_schema: {
      type: "object" as const,
      properties: {
        workspaceId: { type: "string" },
        projectId: { type: "string" },
        estimatedCostCents: { type: "number" },
        intent: { type: "string" },
      },
      required: ["workspaceId", "projectId", "intent"],
    },
  },
  {
    name: "propose_video_options",
    description: "Generate 3 video direction options from user text and optional image.",
    input_schema: {
      type: "object" as const,
      properties: {
        workspaceId: { type: "string" },
        projectId: { type: "string" },
        userMessage: { type: "string" },
        assetId: { type: "string" },
      },
      required: ["workspaceId", "projectId", "userMessage"],
    },
  },
];

@Injectable()
export class OrchestratorService {
  private readonly log = new Logger(OrchestratorService.name);
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private groq?: Groq;

  constructor(
    @Inject(BillingService) private billing: BillingService,
    @Inject(CreatorService) private creator: CreatorService,
    @Inject(GenerationService) private generation: GenerationService,
    @Inject(GovernanceService) private governance: GovernanceService,
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
  ) {
    if (process.env.ANTHROPIC_API_KEY) this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (process.env.OPENAI_API_KEY) this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (process.env.GROQ_API_KEY) this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async checkBudgetAndPolicy(input: {
    workspaceId: string;
    projectId: string;
    estimatedCostCents?: number;
    intent: string;
  }) {
    const ws = await this.workspaces.findById(input.workspaceId).lean();
    const budget = ws?.monthlyBudgetCents ?? 50000;
    const spent = await this.billing.workspaceSpendCents(input.workspaceId);
    const estimate = input.estimatedCostCents ?? 0;
    const remaining = budget - spent;
    const ratio = budget > 0 ? spent / budget : 1;
    let alert: "ok" | "70" | "90" | "100" = "ok";
    if (ratio >= 1) alert = "100";
    else if (ratio >= 0.9) alert = "90";
    else if (ratio >= 0.7) alert = "70";
    const actuallyAllowed = estimate === 0 || spent + estimate <= budget;
    return {
      allowed: actuallyAllowed,
      remainingCents: remaining,
      budgetCents: budget,
      spentCents: spent,
      alert,
      freeTier: estimate === 0,
      reason: actuallyAllowed
        ? estimate === 0
          ? "Plan gratuito: puedes explorar opciones de video sin costo."
          : `Presupuesto disponible: ${(remaining / 100).toFixed(2)} USD restantes.`
        : "El presupuesto de este workspace está agotado. Amplía el límite para generar video.",
    };
  }

  async reply(params: {
    workspaceId: string;
    projectId: string;
    userId: string;
    userMessage: string;
    history: { role: "user" | "assistant"; content: string }[];
    assetId?: string;
    selectedOptionId?: string;
    selectedOption?: VideoOption;
    generateVideo?: boolean;
    locale?: "es" | "en";
  }): Promise<{ text: string; toolTrace: Record<string, unknown> }> {
    const locale = params.locale ?? "es";
    const budget = await this.checkBudgetAndPolicy({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      intent: params.userMessage.slice(0, 500),
      estimatedCostCents: 0,
    });

    const chosen = await this.resolveSelectedOption(params, locale);

    if (chosen && params.generateVideo) {
      try {
        const { job, budget: genBudget } = await this.generation.enqueue(params.userId, {
          workspaceId: params.workspaceId,
          projectId: params.projectId,
          option: chosen,
          assetId: params.assetId,
          locale,
        });
        const text =
          locale === "es"
            ? `**Job encolado** — estoy generando **${chosen.title}** (${chosen.aspectRatio}, ${chosen.durationSec}s) con ${job.provider}.\n\n${genBudget.reason}\n\nVerás el progreso en tiempo real. Costo estimado: ${job.costCents === 0 ? "modo demo" : `$${(job.costCents / 100).toFixed(2)}`}.`
            : `**Job queued** — generating **${chosen.title}** (${chosen.aspectRatio}, ${chosen.durationSec}s) via ${job.provider}.\n\n${genBudget.reason}\n\nWatch live progress below. Estimated cost: ${job.costCents === 0 ? "demo mode" : `$${(job.costCents / 100).toFixed(2)}`}.`;
        return {
          text,
          toolTrace: {
            provider: job.provider,
            budget: genBudget,
            selectedOption: chosen,
            generationJob: job,
          },
        };
      } catch (e) {
        const msg = (e as Error).message;
        const text =
          locale === "es"
            ? `No pude encolar la generación: ${msg}`
            : `Could not enqueue generation: ${msg}`;
        return {
          text,
          toolTrace: { provider: "governance-block", budget, selectedOption: chosen, error: msg },
        };
      }
    }

    if (chosen) {
      const est = this.governance.estimateGenerationCostCents(chosen.durationSec, chosen.aspectRatio);
      const text =
        locale === "es"
          ? `Perfecto — elegiste **${chosen.title}** (${chosen.aspectRatio}, ${chosen.durationSec}s).\n\nTu guion estructurado:\n\n"${chosen.prompt}"\n\nCuando estés listo, pulsa **Generar video** (~$${(est / 100).toFixed(2)} estimado) o dime qué ajustar (duración, cámara, estilo).`
          : `Great — you chose **${chosen.title}** (${chosen.aspectRatio}, ${chosen.durationSec}s).\n\nStructured brief:\n\n"${chosen.prompt}"\n\nWhen ready, click **Generate video** (~$${(est / 100).toFixed(2)} est.) or tell me what to adjust (duration, camera, style).`;
      return {
        text,
        toolTrace: { provider: "local-free", budget, selectedOption: chosen, estimatedCostCents: est },
      };
    }

    const { options, hasImage, assetFilename } = await this.creator.proposeVideoOptions(
      params.userId,
      {
        workspaceId: params.workspaceId,
        projectId: params.projectId,
        userMessage: params.userMessage,
        assetId: params.assetId,
        locale,
      },
    );

    const timeout = Number(process.env.AI_TIMEOUT_MS ?? 25000);
    const system = `Eres el agente creativo de LCS.Dominican. Ayudas a crear videos consultando al creador. Propón opciones claras. Nunca reveles claves API. Responde en ${locale === "es" ? "español" : "inglés"}.`;

    try {
      if (this.anthropic) {
        return await this.withTimeout(
          this.callClaude(system, params, budget, options),
          timeout,
        );
      }
    } catch (e) {
      this.log.warn(`Claude failed: ${(e as Error).message}`);
    }
    try {
      if (this.openai) {
        return await this.withTimeout(
          this.callOpenAI(system, params, budget, options),
          timeout,
        );
      }
    } catch (e) {
      this.log.warn(`OpenAI failed: ${(e as Error).message}`);
    }
    try {
      if (this.groq) {
        return await this.withTimeout(
          this.callGroq(system, params, budget, options),
          timeout,
        );
      }
    } catch (e) {
      this.log.warn(`Groq failed: ${(e as Error).message}`);
    }

    return this.localFreeReply(params, budget, options, hasImage, assetFilename, locale);
  }

  private async resolveSelectedOption(
    params: {
      userId: string;
      workspaceId: string;
      projectId: string;
      userMessage: string;
      assetId?: string;
      selectedOptionId?: string;
      selectedOption?: VideoOption;
      locale?: "es" | "en";
    },
    locale: "es" | "en",
  ): Promise<VideoOption | null> {
    if (params.selectedOption) return params.selectedOption;
    if (!params.selectedOptionId) return null;

    const { options } = await this.creator.proposeVideoOptions(params.userId, {
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      userMessage: params.userMessage,
      assetId: params.assetId,
      locale,
    });
    return options.find((o) => o.id === params.selectedOptionId) ?? null;
  }

  private localFreeReply(
    params: { userMessage: string; assetId?: string },
    budget: Awaited<ReturnType<OrchestratorService["checkBudgetAndPolicy"]>>,
    options: VideoOption[],
    hasImage: boolean,
    assetFilename: string | undefined,
    locale: "es" | "en",
  ) {
    const intro =
      locale === "es"
        ? hasImage
          ? `Analicé tu imagen${assetFilename ? ` (${assetFilename})` : ""} y tu idea. ${budget.reason}\n\nTe propongo **3 direcciones de video**. Elige una para refinarla conmigo:`
          : `Entendí tu idea. ${budget.reason}\n\nTe propongo **3 direcciones de video**. Elige una para refinarla conmigo:`
        : hasImage
          ? `I analyzed your image${assetFilename ? ` (${assetFilename})` : ""} and idea. ${budget.reason}\n\nHere are **3 video directions**. Pick one to refine with me:`
          : `Got your idea. ${budget.reason}\n\nHere are **3 video directions**. Pick one to refine with me:`;

    const text = `${intro}\n\n${options.map((o, i) => `${i + 1}. **${o.title}** — ${o.aspectRatio}, ${o.durationSec}s · ${o.platform}`).join("\n")}`;

    return {
      text,
      toolTrace: {
        provider: "local-free",
        budget,
        videoOptions: options,
        hasImage,
        assetFilename,
      },
    };
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("AI timeout")), ms);
      p.then((v) => {
        clearTimeout(t);
        resolve(v);
      }).catch((e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  private async callClaude(
    system: string,
    params: { userMessage: string; history: { role: "user" | "assistant"; content: string }[]; workspaceId: string; projectId: string },
    budget: Awaited<ReturnType<OrchestratorService["checkBudgetAndPolicy"]>>,
    options: VideoOption[],
  ) {
    const messages = [
      ...params.history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: params.userMessage + "\n\nOptions JSON: " + JSON.stringify(options) },
    ];
    const first = await this.anthropic!.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 900,
      system,
      tools: TOOLS,
      messages,
    });
    const text = first.content
      .filter((c) => c.type === "text")
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    return {
      text: text || "Opciones listas.",
      toolTrace: { provider: "anthropic", budget, videoOptions: options },
    };
  }

  private async callOpenAI(
    system: string,
    params: { userMessage: string },
    budget: Awaited<ReturnType<OrchestratorService["checkBudgetAndPolicy"]>>,
    options: VideoOption[],
  ) {
    const r = await this.openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: params.userMessage + "\nOptions: " + JSON.stringify(options) },
      ],
    });
    return {
      text: r.choices[0]?.message?.content ?? "Opciones listas.",
      toolTrace: { provider: "openai", budget, videoOptions: options },
    };
  }

  private async callGroq(
    system: string,
    params: { userMessage: string },
    budget: Awaited<ReturnType<OrchestratorService["checkBudgetAndPolicy"]>>,
    options: VideoOption[],
  ) {
    const r = await this.groq!.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: params.userMessage + "\nOptions: " + JSON.stringify(options) },
      ],
    });
    return {
      text: r.choices[0]?.message?.content ?? "Opciones listas.",
      toolTrace: { provider: "groq", budget, videoOptions: options },
    };
  }
}
