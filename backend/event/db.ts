import { SQLDatabase } from "encore.dev/storage/sqldb";

export const eventDB = new SQLDatabase("event", {
  migrations: "./migrations",
});
