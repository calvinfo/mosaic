import { tableFromIPC } from 'apache-arrow';
import { Query } from './query';

type Request = {
  query: Query;
  resolve: (value?: any) => void;
  reject: (reason: string) => void;
}

export function socketConnector(uri = 'ws://localhost:3000/') {
  const queue: Request[] = [];
  let request: Request | undefined | null = null;
  let connected = false;
  let ws;

  const events = {
    open() {
      connected = true;
      next();
    },

    close() {
      connected = false;
      request = null;
      ws = null;
      while (queue.length) {
        let req = queue.shift();
        req?.reject('Socket closed');
      }
    },

    error(event) {
      if (request) {
        const { reject } = request;
        request = null;
        next();
        reject(event);
      } else {
        console.error('WebSocket error: ', event);
      }
    },

    message({ data }) {
      if (request) {
        const { query, resolve, reject } = request;

        // clear state, start next request
        request = null;
        next();

        // process result
        if (typeof data === 'string') {
          const json = JSON.parse(data);
          json.error ? reject(json.error) : resolve(json);
        } else if (query.type === 'exec') {
          resolve();
        } else if (query.type === 'arrow') {
          resolve(tableFromIPC(data.arrayBuffer()));
        } else {
          throw new Error(`Unexpected socket data: ${data}`);
        }
      } else {
        console.log('WebSocket message: ', data);
      }
    }
  }

  function init() {
    ws = new WebSocket(uri);
    for (const type in events) {
      ws.addEventListener(type, events[type]);
    }
  }

  function enqueue(query, resolve, reject) {
    if (ws == null) init();
    queue.push({ query, resolve, reject });
    if (connected && !request) next();
  }

  function next() {
    if (queue.length) {
      request = queue.shift();
      ws.send(JSON.stringify(request?.query));
    }
  }

  return {
    get connected() {
      return connected;
    },
    query(query) {
      return new Promise(
        (resolve, reject) => enqueue(query, resolve, reject)
      );
    }
  };
}
