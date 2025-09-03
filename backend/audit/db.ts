import { SQLDatabase } from "encore.dev/storage/sqldb";

export const auditDB = new SQLDatabase("audit", {
  migrations: "./migrations",
});
