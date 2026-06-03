import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  requestId?: string;
  buildId?: string;
  serviceVersion?: string;
  method?: string;
  path?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextData>();

export function runWithRequestContext<T>(
  context: RequestContextData,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContextData | undefined {
  return requestContextStorage.getStore();
}
