import dotenv from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";

export default function setup() {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !url.includes("mudebem_test")) {
    throw new Error("TEST_DATABASE_URL precisa apontar para mudebem_test.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
