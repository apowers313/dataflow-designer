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

/**
 * A dataflow component to store a stream of objects to a SQLite database
 */
export class SQLiteSink extends Sink {
    #databaseFile: string;
    #tableName: string;
    #mapping: DatabaseMap;
    #db!: Database.Database;
    #insertRow!: Database.Statement;
    fileMustExist: boolean;
    dropTable: boolean;
    createTable: boolean;

    /**
     * Creates a new SQLite sink
     *
     * @param cfg - The configuration for the new SQLite sink
     */
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

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #push(chunk: Chunk, _methods: SinkMethods): Promise<void> {
        if (!chunk.isData()) {
            return;
        }

        this.#insertRow.run(this.#mapping.objToParams(chunk.data));
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        this.#db = new Database(this.#databaseFile, {fileMustExist: this.fileMustExist});
        if (this.dropTable) {
            try {
                this.#db.exec(`DROP TABLE ${this.#tableName}`);
            } catch (err) { /* ignored */ }
        }

        if (this.createTable) {
            this.#db.exec(`CREATE TABLE ${this.#tableName} (${this.#mapping.tableDesc()})`);
        }

        this.#insertRow = this.#db.prepare(`INSERT INTO ${this.#tableName} VALUES (${this.#mapping.paramsDesc()})`);

        await super.init();
    }
}
