/**
 * Maps an array of items to promises using a mapping function,
 * verifying that at most `limit` promises are executing at once.
 *
 * @param items Array of items to process
 * @param limit Maximum number of concurrent executions
 * @param fn Mapping function that returns a Promise
 */
export async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    let index = 0;

    const enqueue = (): Promise<void> => {
        if (index === items.length) {
            return Promise.resolve();
        }

        const currentIndex = index++;
        const item = items[currentIndex];

        const promise = Promise.resolve()
            .then(() => fn(item, currentIndex))
            .then((result) => {
                results[currentIndex] = result;
            });

        // Add to executing set
        const p: Promise<void> = promise.then(() => {
            // Remove self from executing list
            executing.splice(executing.indexOf(p), 1);
        });

        executing.push(p);

        // If limit reached, wait for one to finish
        let wait: Promise<void> = Promise.resolve();
        if (executing.length >= limit) {
            wait = Promise.race(executing);
        }

        return wait.then(() => enqueue());
    };

    await enqueue();
    await Promise.all(executing);

    return results;
}
