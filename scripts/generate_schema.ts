import { Database } from "bun:sqlite";

const db_path = "temp.db";
const db = new Database(db_path);
const schema_sql = db
  .query<{ sql: string }, null>(
    "SELECT sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlean_%'",
  )
  .all(null)
  .map((value) => value.sql.replace(/(")/, "IF NOT EXISTS $1") + ";");
db.close();
await Bun.file(db_path).delete();
await Bun.write("public/schema.sql", schema_sql.join("\n") + "\n");
