import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

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
    const url = process.env.REDIS_URL;
    if (!url || this.queue) return;

    try {
      const connection = new IORedis(url, { maxRetriesPerRequest: null });
      this.queue = new Queue("lcs-generation", { connection });
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
      this.log.log("BullMQ generation queue ready");
    } catch (e) {
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
