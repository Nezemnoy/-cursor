import "dotenv/config";
import cron from "node-cron";
import { execSync } from "child_process";

const schedule = process.env.CRON_SCHEDULE ?? "0 7 * * *";

console.log(`Scheduler started. Digest will run at cron: "${schedule}"`);

cron.schedule(schedule, () => {
  console.log(`[${new Date().toISOString()}] Running daily digest...`);
  try {
    execSync("node index.js", { stdio: "inherit" });
  } catch (err) {
    console.error("Digest run failed:", err.message);
  }
});
