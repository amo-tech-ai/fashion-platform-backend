import { SQLDatabase } from "encore.dev/storage/sqldb";

// Use the shared platform database
export const db = SQLDatabase.named("platform");
