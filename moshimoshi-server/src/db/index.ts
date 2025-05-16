import "dotenv/config";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import Pool from "pg-pool";
import type { DB } from "./db.d.ts";

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	}),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
	dialect,
	plugins: [new CamelCasePlugin()],
});
