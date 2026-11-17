import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!database) {
    // Constructing a client is lazy; it allows the public site to build before setup.
    client = postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/blog", { max: 10 });
    database = drizzle(client, { schema });
  }
  return database;
}

export async function closeDb() {
  if (client) await client.end();
  client = undefined;
  database = undefined;
}
