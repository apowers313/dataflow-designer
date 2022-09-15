import {Chunk, Sink, SinkMethods, SinkOpts} from "@dataflow-designer/dataflow-core";
import Database from "better-sqlite3";
import {DatabaseMap} from "./DatabaseMap";
import {SQLiteCommonOpts} from "./opts";

interface SQLiteSinkOpts extends SQLiteCommonOpts, Omit<SinkOpts, "push"> {
    mapping: DatabaseMap;
    fileMustExist?: boolean;
    dropTable?: boolean;
    createTable?: boolean;
    freshTable?: boolean;
}

export class SQLiteSink extends Sink {
    #databaseFile: string;
    #tableName: string;
    #mapping: DatabaseMap;
    #db!: Database.Database;
    #insertRow!: Database.Statement;
    fileMustExist: boolean;
    dropTable: boolean;
    createTable: boolean;

    constructor(cfg: SQLiteSinkOpts) {
        super({
            ... cfg,
            mode: "fifo",
            push: (chunk, methods) => this.#push(chunk, methods),
        });

        this.#databaseFile = cfg.databaseFile;
        this.#tableName = cfg.tableName;
        this.#mapping = cfg.mapping;
        this.fileMustExist = cfg.fileMustExist ?? true;
        this.dropTable = cfg.dropTable ?? false;
        this.createTable = cfg.createTable ?? false;
        if (cfg.freshTable) {
            this.dropTable = true;
            this.createTable = true;
        }
    }

    async #push(chunk: Chunk, _methods: SinkMethods): Promise<void> {
        console.log("push");
        if (!chunk.isData()) {
            return;
        }

        console.log("inserting row");
        this.#insertRow.run(this.#mapping.objToParams(chunk.data));
        console.log("row inserted");
    }

    async init(): Promise<void> {
        this.#db = new Database(this.#databaseFile, {fileMustExist: this.fileMustExist});
        if (this.dropTable) {
            try {
                this.#db.exec(`DROP TABLE ${this.#tableName}`);
                console.log("Table dropped");
            } catch (err) {
                console.log("Table not dropped");
            }
        }

        if (this.createTable) {
            console.log("creating table");
            this.#db.exec(`CREATE TABLE ${this.#tableName} (${this.#mapping.tableDesc()})`);
        }

        console.log("preparing statment");
        this.#insertRow = this.#db.prepare(`INSERT INTO ${this.#tableName} VALUES (${this.#mapping.paramsDesc()})`);
        console.log("statement prepared");

        // const newPerson = db.prepare("INSERT INTO person VALUES (?, ?, ?, ?, ?)");
        // const args = [0, "Bob", "Smith", "408-555-1212", "bob@gmail.com"];
        // newPerson.run(...args);
        // newPerson.run(1, "Jane", "Doe", "925-555-1212", "jane@hotmail.com");

        await super.init();
    }
}
