import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import Database from "better-sqlite3";
import {DatabaseMap} from "./DatabaseMap";
import {SQLiteCommonOpts} from "./opts";

interface SQLiteSourceOpts extends SQLiteCommonOpts, Omit<SourceOpts, "pull"> {
    mapping?: DatabaseMap;
}

/**
 * Streams objects from a SQLite database
 */
export class SQLiteSource extends Source {
    #databaseFile: string;
    #tableName: string;
    #mapping: DatabaseMap | null;
    #db!: Database.Database;
    #getRow!: Database.Statement;
    #rowIter!: IterableIterator<Record<any, any>>;

    /**
     * Creates a new SQLite database source
     *
     * @param cfg - The options for the new SQLite source
     */
    constructor(cfg: SQLiteSourceOpts) {
        super({
            ... cfg,
            pull: async(methods): Promise<void> => this.#pull(methods),
        });

        this.#databaseFile = cfg.databaseFile;
        this.#tableName = cfg.tableName;
        this.#mapping = cfg.mapping ?? null;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #pull(methods: SourceMethods): Promise<void> {
        const {done, value} = this.#rowIter.next();
        if (done) {
            await methods.finished();
            return;
        }

        let data = value;
        if (this.#mapping) {
            data = this.#mapping.rowToObj(value);
        }

        const chunk = Chunk.create({type: "data", data});
        await methods.send(0, chunk);
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        this.#db = new Database(this.#databaseFile, {fileMustExist: true});
        // TODO: select specific fields?
        this.#getRow = this.#db.prepare(`SELECT * FROM ${this.#tableName}`);
        this.#rowIter = this.#getRow.iterate();

        await super.init();
    }
}
