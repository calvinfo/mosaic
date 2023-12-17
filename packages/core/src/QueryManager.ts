import { consolidator } from './QueryConsolidator.js';
import { lruCache, voidCache, Cache } from './util/cache';
import { priorityQueue } from './util/priority-queue';
import { queryResult } from './util/query-result';
import { Manager } from './Manager';
import { Logger } from './Logger';

export enum Priority { 
  High = 0,
  Normal = 1,
  Low = 2,
};

export function QueryManager(): Manager {
  const queue = priorityQueue(3);
  let db;
  let clientCache: Cache<string, any>;
  let logger: Logger;
  let recorders = [];
  let pending: Promise | null = null;
  let consolidate;

  function next() {
    if (pending || queue.isEmpty()) return;
    const { request, result } = queue.next();
    pending = submit(request, result);
    pending.finally(() => { pending = null; next(); });
  }

  function enqueue(entry, priority = Priority.Normal) {
    queue.insert(entry, priority);
    next();
  }

  function recordQuery(sql) {
    if (recorders.length && sql) {
      recorders.forEach(rec => rec.add(sql));
    }
  }

  async function submit(request: {
    query: any,
    type: any,
    cache: boolean,
    record: boolean,
    options: any,
  }, result) {
    try {
      const { query, type, cache = false, record = true, options } = request;
      const sql = query ? `${query}` : null;

      // update recorders
      if (record) {
        recordQuery(sql);
      }

      // check query cache
      if (cache) {
        const cached = clientCache.get(sql);
        if (cached) {
          logger.debug('Cache');
          result.fulfill(cached);
          return;
        }
      }

      // issue query, potentially cache result
      const t0 = performance.now();
      const data = await db.query({ type, sql, ...options });
      if (cache && sql) clientCache.set(sql, data);
      logger.debug(`Request: ${(performance.now() - t0).toFixed(1)}`);
      result.fulfill(data);
    } catch (err) {
      result.reject(err);
    }
  }

  return {
    cache(value?: Cache<string, any> | boolean) {
      return value !== undefined
        ? (clientCache = value === true ? lruCache() : (value || voidCache()))
        : clientCache;
    },

    logger(value) {
      return value ? (logger = value) : logger;
    },

    connector(connector) {
      return connector ? (db = connector) : db;
    },

    consolidate(flag) {
      if (flag && !consolidate) {
        consolidate = consolidator(enqueue, clientCache, recordQuery);
      } else if (!flag && consolidate) {
        consolidate = null;
      }
    },

    request(request, priority = Priority.Normal) {
      const result = queryResult();
      const entry = { request, result };
      if (consolidate) {
        consolidate.add(entry, priority);
      } else {
        enqueue(entry, priority);
      }
      return result;
    },

    cancel(requests) {
      const set = new Set(requests);
      queue.remove(({ result }) => set.has(result));
    },

    clear() {
      queue.remove(({ result }) => {
        result.reject('Cleared');
        return true;
      });
    },

    record() {
      let state: string[] = [];
      const recorder = {
        add(query: string) {
          state.push(query);
        },
        reset() {
          state = [];
        },
        snapshot() {
          return state.slice();
        },
        stop() {
          recorders = recorders.filter(x => x !== recorder);
          return state;
        }
      };
      recorders.push(recorder);
      return recorder;
    }
  };
}
