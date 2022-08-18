/* eslint-disable jsdoc/require-jsdoc */
export function objectStream(objs: Array<Record<any, any>>): ReadableStream {
    let curr = 0;
    return new ReadableStream({
        pull: async(controller): Promise<void> => {
            if (curr > (objs.length - 1)) {
                controller.close();
                return;
            }

            const next = objs[curr];
            curr++;
            controller.enqueue(next);
        },
    });
}

export function buf2str(buf: Uint8Array): string {
    return new TextDecoder().decode(buf);
}
