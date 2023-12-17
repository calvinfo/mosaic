import { Cache } from "./util/cache";

export interface Manager {
  cache(value?: Cache<string, any> | boolean): Cache<string, any> | undefined;
  logger(value: any): any;
  connector(connector: any): any;
  consolidate(flag: any): void;
  request(request: any, priority?: number): Promise<any>;
  cancel(requests: any): void;
  clear(): void;
  record(): void;
}