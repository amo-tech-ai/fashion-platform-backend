import { SQLDatabase } from "encore.dev/storage/sqldb";

export const organizerDB = new SQLDatabase("organizer", {
  migrations: "./migrations",
});
