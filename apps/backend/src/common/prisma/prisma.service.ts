import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

type PrismaModel = Record<string, unknown>;

const createUnavailableModel = (modelName: string): PrismaModel =>
  new Proxy(
    {},
    {
      get: (_, prop: string | symbol) => {
        if (typeof prop === 'symbol') {
          return undefined;
        }

        return () => {
          throw new Error(`Prisma client is not configured. Cannot call ${modelName}.${prop}.`);
        };
      },
    },
  );

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient | null;

  readonly user: any;
  readonly alert: any;
  readonly alertDispatch: any;
  readonly fcmToken: any;
  readonly $transaction: any;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      const { Pool } = require('pg') as any;
      const { PrismaPg } = require('@prisma/adapter-pg') as any;
      const pool = new Pool({ connectionString: databaseUrl });
      this.client = new PrismaClient({
        adapter: new PrismaPg(pool),
      });
      const client = this.client as any;
      this.user = client.user;
      this.alert = client.alert;
      this.alertDispatch = client.alertDispatch;
      this.fcmToken = client.fcmToken;
      this.$transaction = client.$transaction.bind(client);
      return;
    }

    this.client = null;
    this.user = createUnavailableModel('user');
    this.alert = createUnavailableModel('alert');
    this.alertDispatch = createUnavailableModel('alertDispatch');
    this.fcmToken = createUnavailableModel('fcmToken');
    this.$transaction = createUnavailableModel('$transaction');
  }

  async onModuleInit() {
    if (this.client) {
      await this.client.$connect();
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}
