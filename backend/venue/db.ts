import { SQLDatabase } from "encore.dev/storage/sqldb";

export const venueDB = new SQLDatabase("venue", {
  migrations: "./migrations",
});
