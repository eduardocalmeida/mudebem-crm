import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl?.includes("mudebem_test")) {
  throw new Error("Defina TEST_DATABASE_URL apontando para o banco mudebem_test.");
}

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 40000,
    testTimeout: 20000,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: process.env.AUTH_SECRET || "segredo-de-teste-com-32-caracteres",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
