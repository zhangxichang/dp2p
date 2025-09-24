import { Dexie, type EntityTable } from "dexie";
import type { Account } from "./routes/window/login";

declare global {
    var database: Database | null;
}

export class Database {
    dexie: Dexie;

    private constructor(dexie: Dexie) {
        this.dexie = dexie;
    }
    static async init() {
        const dexie = new Dexie("database");
        dexie.version(1).stores({ accounts: "&id,name" });
        return new Database(await dexie.open());
    }
    async add_account(account: Account) {
        await (this.dexie as Dexie & { accounts: EntityTable<Account, "id"> }).accounts.add(account);
    }
    async put_account(account: Account) {
        await (this.dexie as Dexie & { accounts: EntityTable<Account, "id"> }).accounts.put(account);
    }
    async get_account(id: string) {
        return await (this.dexie as Dexie & { accounts: EntityTable<Account, "id"> }).accounts.get(id);
    }
    async get_accounts() {
        return await (this.dexie as Dexie & { accounts: EntityTable<Account, "id"> }).accounts.toArray();
    }
}
