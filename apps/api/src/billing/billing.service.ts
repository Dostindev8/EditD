import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

type PoolLike = {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  end: () => Promise<void>;
  on: (ev: string, cb: (e: Error) => void) => void;
};

export type GenerationJobRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  provider: string;
  status: string;
  costCents: number;
  prompt: string;
  externalId?: string;
};

@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BillingService.name);
  private pool: PoolLike | null = null;
  private mem = new Map<string, number>();
  private memJobs: GenerationJobRecord[] = [];

  constructor() {
    const url = process.env.POSTGRES_URL;
    if (url) {
      void this.init(url);
    }
  }

  async onModuleInit() {
    await this.ensureSchema();
  }

  private async init(url: string) {
    const mod = await import("pg");
    const Pool = (mod as { default?: { Pool: new (o: object) => PoolLike }; Pool?: new (o: object) => PoolLike }).Pool
      ?? (mod as { default: { Pool: new (o: object) => PoolLike } }).default.Pool;
    this.pool = new Pool({ connectionString: url, max: 5 });
    this.pool.on("error", (e) => this.log.warn(e.message));
    await this.ensureSchema();
  }

  private async ensureSchema() {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS ai_generation_jobs (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          status TEXT NOT NULL,
          cost_cents INT NOT NULL DEFAULT 0,
          prompt TEXT,
          external_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        )`,
        [],
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_ai_jobs_workspace ON ai_generation_jobs(workspace_id)",
        [],
      );
    } catch (e) {
      this.log.warn(`Billing schema init skipped: ${(e as Error).message}`);
    }
  }

  async workspaceSpendCents(workspaceId: string): Promise<number> {
    if (this.pool) {
      try {
        const r = await this.pool.query(
          "SELECT COALESCE(SUM(cost_cents),0)::int AS s FROM ai_generation_jobs WHERE workspace_id=$1",
          [workspaceId],
        );
        return Number(r.rows[0]?.s ?? 0);
      } catch {
        this.log.warn("Postgres billing read failed; using memory ledger");
      }
    }
    return this.mem.get(workspaceId) ?? 0;
  }

  async recordGenerationJob(job: GenerationJobRecord): Promise<void> {
    if (job.status === "completed" && job.costCents > 0) {
      const prev = this.mem.get(job.workspaceId) ?? 0;
      this.mem.set(job.workspaceId, prev + job.costCents);
    }
    this.memJobs.push(job);

    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO ai_generation_jobs
          (id, workspace_id, project_id, user_id, provider, status, cost_cents, prompt, external_id, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $6='completed' THEN NOW() ELSE NULL END)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           cost_cents = EXCLUDED.cost_cents,
           external_id = EXCLUDED.external_id,
           completed_at = CASE WHEN EXCLUDED.status='completed' THEN NOW() ELSE ai_generation_jobs.completed_at END`,
        [
          job.id,
          job.workspaceId,
          job.projectId,
          job.userId,
          job.provider,
          job.status,
          job.costCents,
          job.prompt.slice(0, 4000),
          job.externalId ?? null,
        ],
      );
    } catch (e) {
      this.log.warn(`Postgres job record failed: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.pool) await this.pool.end();
  }
}
