import { Context, Logger } from 'koishi';
import { SearchResult, FetchResult } from './types';
import { Config } from './config';
export declare function createApi(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void): {
    fetchThread: (threadId: string) => Promise<FetchResult>;
    fetchRandomId: () => Promise<string>;
    searchThreads: (keyword: string) => Promise<SearchResult[]>;
};
