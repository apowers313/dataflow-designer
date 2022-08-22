/* eslint-disable jsdoc/require-jsdoc */
type ResolveFn = (... args: any[]) => void;

export class Interlock<T> {
    #writeDone!: Promise<T>;
    #writeResolve!: ResolveFn;
    #readDone!: Promise<void>;
    #readResolve!: ResolveFn;

    constructor() {
        this.reset();
    }

    async send(data: T | null): Promise<void> {
        this.#writeResolve(data);
        await this.#readDone;
    }

    async recv(): Promise<T | null> {
        const data = await this.#writeDone;
        this.#readResolve();
        this.reset();
        return data;
    }

    reset(): void {
        this.#writeDone = new Promise((resolve) => {
            this.#writeResolve = resolve;
        });

        this.#readDone = new Promise((resolve) => {
            this.#readResolve = resolve;
        });
    }
}

export async function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
