import { SQLDatabase } from "encore.dev/storage/sqldb";

export const fashionistasDB = new SQLDatabase("fashionistas", {
  migrations: "./migrations",
});
