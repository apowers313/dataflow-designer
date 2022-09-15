import objectPath from "object-path";

type DatabaseAttributes = "unique" | "required" | "key";

interface AnyObj {
    [key: string]: any;
}

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

export class FieldDesc {
    readonly dbCol: string;
    readonly objPath: string;
    readonly type: DatabaseTypes;
    readonly size: number | null;
    readonly isRequired: boolean;
    readonly isUnique: boolean;
    // readonly isKey: boolean;

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

export class DatabaseMap {
    #dbToObj: Map<string, FieldDesc> = new Map();
    #objToDb: Map<string, FieldDesc> = new Map();

    constructor(fields: Array<FieldDescCfg> = []) {
        fields.forEach((cfg) => this.add(cfg));
    }

    add(cfg: FieldDescCfg): void {
        const fieldDesc = new FieldDesc(cfg);
        this.#dbToObj.set(fieldDesc.dbCol, fieldDesc);
        this.#objToDb.set(fieldDesc.objPath, fieldDesc);
    }

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

        console.log("objToRow ret", ret);

        return ret;
    }

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

    tableDesc(): string {
        const cols = [... this.#dbToObj.values()];
        const colStrs: Array<string> = cols.map((c) => {
            return c.toString();
        });

        return colStrs.join(", ");
    }

    get size(): number {
        return this.#dbToObj.size;
    }

    paramsDesc(): string {
        const params = [... this.#dbToObj.values()];
        const paramStrs: Array<string> = params.map((p) => {
            return `:${p.dbCol}`;
        });

        return paramStrs.join(", ");
    }
}
