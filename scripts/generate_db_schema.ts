import { Database } from "bun:sqlite";

const db_path = "temp.db";
const db = new Database(db_path);
const schema_sql = db
  .query<{ sql: string }, null>(
    "SELECT sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlean_%'",
  )
  .all(null)
  .map((value) => {
    if (value.sql.startsWith("CREATE TABLE")) {
      value.sql = value.sql.replace(
        /^CREATE TABLE/,
        "CREATE TABLE IF NOT EXISTS",
      );
    } else if (value.sql.startsWith("CREATE UNIQUE INDEX")) {
      value.sql = value.sql.replace(
        /^CREATE UNIQUE INDEX/,
        "CREATE UNIQUE INDEX IF NOT EXISTS",
      );
    } else if (value.sql.startsWith("CREATE INDEX")) {
      value.sql = value.sql.replace(
        /^CREATE INDEX/,
        "CREATE INDEX IF NOT EXISTS",
      );
    }
    return value.sql + ";";
  });
db.close();
await Bun.file(db_path).delete();
await Bun.write("public/schema.sql", schema_sql.join("\n") + "\n");
