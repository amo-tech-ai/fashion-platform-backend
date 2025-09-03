import { SQLDatabase } from "encore.dev/storage/sqldb";

export const designerDB = new SQLDatabase("designer", {
  migrations: "./migrations",
});
