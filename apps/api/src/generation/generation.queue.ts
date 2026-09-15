import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";

type JobHandler = (jobId: string) => Promise<void>;

@Injectable()
export class GenerationQueueService implements OnModuleDestroy {
  private readonly log = new Logger(GenerationQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private memQueue: string[] = [];
  private memRunning = false;
  private handler: JobHandler | null = null;

  registerHandler(fn: JobHandler) {
    this.handler = fn;
    this.init();
  }

  private init() {
    if (this.queue) return;
    const url = process.env.REDIS_URL?.trim();

    if (!url) {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_QUEUE !== "true") {
        throw new Error(
          "REDIS_URL no está definida en producción. Define REDIS_URL o ALLOW_MEMORY_QUEUE=true (solo demos).",
        );
      }
      this.log.warn(
        process.env.NODE_ENV === "production"
          ? "REDIS_URL ausente + ALLOW_MEMORY_QUEUE=true — cola en memoria (demo; se pierde al reiniciar)."
          : "REDIS_URL ausente — usando cola en memoria (solo development/test).",
      );
      return;
    }

    try {
      const connection = new Redis(url, { maxRetriesPerRequest: null });
      this.queue = new Queue("lcs-generation", { connection });
      // Concurrency capped at 2 until a dedicated worker process is split out (P1.3).
      this.worker = new Worker(
        "lcs-generation",
        async (job) => {
          if (this.handler) await this.handler(String(job.data.jobId));
        },
        { connection: connection.duplicate(), concurrency: 2 },
      );
      this.worker.on("failed", (job, err) => {
        this.log.warn(`BullMQ job ${job?.id} failed: ${err.message}`);
      });
      this.log.log("BullMQ generation queue ready (concurrency: 2)");
    } catch (e) {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_QUEUE !== "true") {
        throw new Error(`BullMQ/Redis no disponible en producción: ${(e as Error).message}`);
      }
      this.log.warn(`BullMQ unavailable, using in-memory queue: ${(e as Error).message}`);
      this.queue = null;
    }
  }

  async enqueue(jobId: string): Promise<void> {
    if (this.queue) {
      const opts: JobsOptions = {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
      };
      await this.queue.add("process", { jobId }, opts);
      return;
    }

    this.memQueue.push(jobId);
    void this.drainMemory();
  }

  private async drainMemory() {
    if (this.memRunning || !this.handler) return;
    this.memRunning = true;
    while (this.memQueue.length) {
      const id = this.memQueue.shift()!;
      try {
        await this.handler(id);
      } catch (e) {
        this.log.warn(`Memory queue job ${id} failed: ${(e as Error).message}`);
      }
    }
    this.memRunning = false;
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
