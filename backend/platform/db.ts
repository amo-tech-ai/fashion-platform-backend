import { SQLDatabase } from "encore.dev/storage/sqldb";

// This is the main database for the platform.
export const db = new SQLDatabase("platform", {
  migrations: "./migrations",
});
