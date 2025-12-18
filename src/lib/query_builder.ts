import type { DB } from "~/db_schema.gen";
import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";

export const QueryBuilder = new Kysely<DB>({
  dialect: {
    createDriver: () => new DummyDriver(),
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createAdapter: () => new SqliteAdapter(),
    createIntrospector: (db) => new SqliteIntrospector(db),
  },
});
