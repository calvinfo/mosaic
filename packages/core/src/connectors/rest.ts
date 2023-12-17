import { tableFromIPC } from 'apache-arrow';
import { Query } from './query';

export function restConnector(uri = 'http://localhost:3000/') {
  return {
    async query(query: Query) {
      const req = fetch(uri, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      return query.type === 'exec' ? req
        : query.type === 'arrow' ? tableFromIPC(req)
        : (await req).json();
    }
  };
}
