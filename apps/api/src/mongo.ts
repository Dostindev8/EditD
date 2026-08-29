import { Logger } from "@nestjs/common";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const log = new Logger("Mongo");
let mem: MongoMemoryServer | null = null;

export async function connectMongo(): Promise<string> {
  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lcs_dominican";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    await mongoose.disconnect();
    log.log(`Mongo available at ${uri}`);
    return uri;
  } catch {
    log.warn("Mongo unavailable — mongodb-memory-server (dev Phase 0)");
    mem = await MongoMemoryServer.create();
    const memUri = mem.getUri("lcs_dominican");
    process.env.MONGODB_URI = memUri;
    return memUri;
  }
}
