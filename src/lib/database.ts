import Database from "@tauri-apps/plugin-sql";

// Database connection singleton
let db: Database | null = null;

/**
 * Get the database connection.
 * Creates a new connection if one doesn't exist.
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:loikka.db");
  }
  return db;
}

/**
 * Execute a SELECT query and return results.
 * @param sql SQL query string
 * @param bindValues Optional array of values to bind to the query
 * @returns Array of results
 */
export async function query<T>(
  sql: string,
  bindValues?: unknown[]
): Promise<T[]> {
  const database = await getDatabase();
  return database.select<T[]>(sql, bindValues);
}

/**
 * Execute a single row SELECT query.
 * @param sql SQL query string
 * @param bindValues Optional array of values to bind to the query
 * @returns Single result or null
 */
export async function queryOne<T>(
  sql: string,
  bindValues?: unknown[]
): Promise<T | null> {
  const results = await query<T>(sql, bindValues);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query.
 * @param sql SQL query string
 * @param bindValues Optional array of values to bind to the query
 * @returns Object with lastInsertId and rowsAffected
 */
export async function execute(
  sql: string,
  bindValues?: unknown[]
): Promise<{ lastInsertId: number; rowsAffected: number }> {
  const database = await getDatabase();
  const result = await database.execute(sql, bindValues);
  return {
    lastInsertId: result.lastInsertId ?? 0,
    rowsAffected: result.rowsAffected,
  };
}

/**
 * Execute multiple queries in a transaction.
 * @param queries Array of query objects with query string and optional bind values
 * @returns Array of results for each query
 */
export async function transaction(
  queries: { sql: string; bindValues?: unknown[] }[]
): Promise<{ lastInsertId: number; rowsAffected: number }[]> {
  const database = await getDatabase();
  const results: { lastInsertId: number; rowsAffected: number }[] = [];

  await database.execute("BEGIN TRANSACTION");
  try {
    for (const q of queries) {
      const result = await database.execute(q.sql, q.bindValues);
      results.push({
        lastInsertId: result.lastInsertId ?? 0,
        rowsAffected: result.rowsAffected,
      });
    }
    await database.execute("COMMIT");
    return results;
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  }
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
