import objectPath from "object-path";

type DatabaseAttributes = "unique" | "required" | "key";

export type FieldDescCfg = (IntType | TextType | FloatType | DateType | TimeType | DateTimeType) & {
    dbCol: string;
    objPath: string;
    size?: number;
    attributes?: Array<DatabaseAttributes>;
};

type DatabaseTypes = FieldDescCfg["type"];

type IntType = {type: "integer"};
type TextType = {type: "text"};
type FloatType = { type: "float" };
type DateType = { type: "date" };
type TimeType = { type: "time" };
type DateTimeType = { type: "datetime" };

/**
 * A database field / column and all it's associated attributes
 */
export class FieldDesc {
    readonly dbCol: string;
    readonly objPath: string;
    readonly type: DatabaseTypes;
    readonly size: number | null;
    readonly isRequired: boolean;
    readonly isUnique: boolean;
    // readonly isKey: boolean;

    /**
     * Creates a new database field
     *
     * @param cfg - Configuration for the new field
     */
    constructor(cfg: FieldDescCfg) {
        this.dbCol = cfg.dbCol;
        this.objPath = cfg.objPath;
        this.type = cfg.type;
        this.size = cfg.size ?? null;
        const attributes = cfg.attributes ?? [];
        this.isRequired = attributes.includes("required");
        this.isUnique = attributes.includes("unique");
        // this.isKey = cfg.attributes.includes("key");
    }

    /**
     * Converts the field to a string. Useful for describing a table.
     *
     * @returns a string describing the field
     */
    toString(): string {
        let ret = `${this.dbCol} ${this.type}`;
        if (this.isRequired) {
            ret += " NOT NULL";
        }

        if (this.isUnique) {
            ret += " UNIQUE";
        }

        return ret;
    }
}

/**
 * A mapping between object properties and database fields. Used to save objects to a database (e.g. convert objects to
 * an "INSERT" query) or retrieve objects from a database (e.g. use a "SELECT" query and then map the results to an object)
 */
export class DatabaseMap {
    #dbToObj: Map<string, FieldDesc> = new Map();
    #objToDb: Map<string, FieldDesc> = new Map();

    /**
     * Creates a new mapping between object properties and database fields. Can be initialized with an array of fields
     * or fields can be added later with the `add` method.
     *
     * @param fields - Optional fields to initialize the mapping with
     */
    constructor(fields: Array<FieldDescCfg> = []) {
        fields.forEach((cfg) => this.add(cfg));
    }

    /**
     * Adds a new field to this mapping
     *
     * @param cfg - the field to add
     */
    add(cfg: FieldDescCfg): void {
        const fieldDesc = new FieldDesc(cfg);
        this.#dbToObj.set(fieldDesc.dbCol, fieldDesc);
        this.#objToDb.set(fieldDesc.objPath, fieldDesc);
    }

    /**
     * Converts an object (presumably with properties that are identified by fields that have been added to this mapping)
     * into a list of query parameters. The query parameters can be passed to a "INSERT" or "SELECT" call.
     *
     * @param obj - The object to convert
     * @returns a record containing the database fields with the correspnding values from the object
     */
    objToParams(obj: Record<any, any>): Record<any, any> {
        const ret: Record<any, any> = {};
        const params = [... this.#dbToObj.values()];
        params.forEach((p) => {
            ret[p.dbCol] = objectPath.get(obj, p.objPath);

            // throw if obj[objPath] is undefined and field isRequired
            if ((ret[p.dbCol] === null || ret[p.dbCol] === undefined) && p.isRequired) {
                throw new Error(`Error while assigning '${p.objPath}' to '${p.dbCol}': field is required but value was nullish`);
            }
        });

        return ret;
    }

    /**
     * Uses the mapping to convert a row of data from the database into the corresponding object
     *
     * @param row - An object representing a row of data from the database
     * @returns an object that has been mapped from the row
     */
    rowToObj(row: Record<any, any>): Record<any, any> {
        const ret: Record<any, any> = {};

        Object.keys(row).forEach((r) => {
            const f = this.#dbToObj.get(r);
            if (!f) {
                throw new Error(`database mapping doesn't contain an entry for: '${r}'`);
            }

            objectPath.set(ret, f.objPath, row[f.dbCol]);
        });

        return ret;
    }

    /**
     * Creates a string that can be used to create the database table that corresponds to this mapping
     *
     * @returns a string that can be passed to a "TABLE CREATE" call to create all the database columns required for
     * this mapping
     */
    tableDesc(): string {
        const cols = [... this.#dbToObj.values()];
        const colStrs: Array<string> = cols.map((c) => {
            return c.toString();
        });

        return colStrs.join(", ");
    }

    /**
     * Returns the number of items in this database mapping
     */
    get size(): number {
        return this.#dbToObj.size;
    }

    /**
     * Creates a query parameter string for SQLite
     *
     * @returns a string representing the parameters that will be used for a SQLite databse call
     */
    paramsDesc(): string {
        const params = [... this.#dbToObj.values()];
        const paramStrs: Array<string> = params.map((p) => {
            return `:${p.dbCol}`;
        });

        return paramStrs.join(", ");
    }
}
