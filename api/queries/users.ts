import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb().select().from(users).where(eq(users.unionId, unionId)).limit(1);
  return rows.at(0);
}

export async function upsertUser(data: Partial<typeof users.$inferInsert> & { unionId: string }) {
  const values = { ...data };
  const updateSet = {
    lastSignInAt: new Date(),
    ...data,
  };
  if (values.role === undefined && values.unionId && values.unionId === env.ownerUnionId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await getDb().insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
