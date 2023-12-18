export type QueryResult<T> = Promise<T> & {
  fulfill: (value: T) => void;
  reject: (err: string) => void;
};

export function queryResult<T>(): QueryResult<T> {
  let resolve;
  let reject;
  const p = new Promise<T>((r, e) => {
    resolve = r;
    reject = e;
  });
  (p as unknown as QueryResult<T>).fulfill = (value: T) => (resolve(value), p);
  (p as unknown as QueryResult<T>).reject = (err: string) => (reject(err), p);
  return p as QueryResult<T>
}
