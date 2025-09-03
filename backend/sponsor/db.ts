import { SQLDatabase } from "encore.dev/storage/sqldb";

export const sponsorDB = new SQLDatabase("sponsor", {
  migrations: "./migrations",
});
