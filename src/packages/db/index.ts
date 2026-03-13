import { Database } from "bun:sqlite";
import { join, resolve } from "path";
import { readFileSync } from "fs";

// Initialize SQLite database
// Resolving strictly from the package root upward to the monorepo root to guarantee
// only ONE database is ever created, regardless of whether `cd apps/server` or `bun dev` invoked us.
const rootDir = resolve(import.meta.dir, "..", "..");
const dbPath = join(rootDir, "calypso.sqlite");
console.log("[db] Binding to SQLite at:", dbPath);
export const sqlite = new Database(dbPath, { create: true });

// Enable strict foreign key enforcement in SQLite
sqlite.exec("PRAGMA foreign_keys = ON;");

/**
 * Initializes the database tables by executing the native raw SQL schema.
 * This function should be called at server startup to ensure tables exist.
 */
export function migrate() {
    console.log("[db] Initializing SQLite database schema...");
    const schemaSql = readFileSync(join(import.meta.dir, "schema.sql"), "utf-8");

    // Using transaction for safe schema application
    const runSchema = sqlite.transaction(() => {
        // Remove comments and split by semicolon
        const cleanSql = schemaSql
            .replace(/--.*$/gm, '') // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            sqlite.exec(statement);
        }
    });

    try {
        runSchema();
        console.log("[db] Schema migration complete.");
    } catch (err) {
        console.error("[db] Schema migration failed:", err);
        throw err;
    }
}
