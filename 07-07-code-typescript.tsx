import { drizzle } from "drizzle-orm/postgres-js";
import { migrate }  from "drizzle-orm/postgres-js/migrator";
import postgres     from "postgres";

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db         = drizzle(connection);

  console.log("⏳ Running DAAT unified migrations...");
  const start = Date.now();

  await migrate(db, { migrationsFolder: "drizzle" });

  const duration = Date.now() - start;
  console.log(`✅ DAAT migrations complete in ${duration}ms`);
  console.log("   Tables: users, ai_sessions, ai_messages, ai_memory");
  console.log("   Tables: neural_sessions, neural_snapshots");
  console.log("   Tables: live_blocks, block_events");
  console.log("   Tables: daat_sessions, daat_packet_log");
  console.log("   Tables: collaborators");

  await connection.end();
};

runMigrate().catch((err) => {
  console.error("❌ DAAT migration failed:", err);
  process.exit(1);
});