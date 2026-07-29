import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as { __mysqlPool?: mysql.Pool };

export const pool =
  globalForDb.__mysqlPool ??
  mysql.createPool({
    uri: url,
    connectionLimit: 10,
    waitForConnections: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mysqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
