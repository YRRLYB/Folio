import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "Blog Studio",
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  // Production nginx overwrites this header; the app listens on loopback only.
  advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
  // Setup mode never serves auth routes; the ephemeral key only avoids a default secret at build time.
  secret: process.env.BETTER_AUTH_SECRET || randomBytes(32).toString("hex"),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});
