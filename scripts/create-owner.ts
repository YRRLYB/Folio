import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { closeDb, getDb } from "../src/db";
import { account, user } from "../src/db/schema";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD (at least 12 characters)");
  }

  const db = getDb();
  const existing = await db.select({ id: user.id }).from(user).limit(1);
  if (existing.length) {
    throw new Error("An owner already exists. Refusing to create another account.");
  }

  const id = crypto.randomUUID();
  const hashed = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: process.env.OWNER_NAME?.trim() || "Owner",
      email,
      emailVerified: true,
    });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: hashed,
    });
  });
  console.log("Owner created:", email);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => closeDb());
