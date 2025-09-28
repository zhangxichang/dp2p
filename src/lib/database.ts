import Dexie from "dexie";

export class Database {
    private dexie: Dexie;

    private constructor(dexie: Dexie) {
        this.dexie = dexie;
    }
    static async new() {
        const dexie = new Dexie("database");
        dexie.version(1).stores({ accounts: "&id,name,key,avatar" });
        return new Database(await dexie.open());
    }
    async add<T>(table: string, value: T) {
        await this.dexie.table<T>(table).add(value);
    }
    async put<T>(table: string, value: T) {
        await this.dexie.table<T>(table).put(value);
    }
    async get<T>(table: string, id: string) {
        return await this.dexie.table<T>(table).get(id);
    }
    async get_all<T>(table: string) {
        return await this.dexie.table<T>(table).toArray();
    }
    async delete() {
        await this.dexie.delete({ disableAutoOpen: false });
    }
}
