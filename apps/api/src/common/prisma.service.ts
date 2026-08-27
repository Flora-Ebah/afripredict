import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs fn in a serializable transaction, retrying on serialization conflicts.
   * All financial mutations (orders, matching, settlement) must go through this.
   */
  async serializableTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        });
      } catch (err: any) {
        const retriable = err?.code === "P2034" || /serialize|deadlock/i.test(String(err?.message));
        if (!retriable || attempt >= retries) throw err;
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
  }
}
