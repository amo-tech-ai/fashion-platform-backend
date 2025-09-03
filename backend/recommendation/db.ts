import { SQLDatabase } from "encore.dev/storage/sqldb";

export const recommendationDB = new SQLDatabase("recommendation", {
  migrations: "./migrations",
});
