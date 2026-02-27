import { Context, Logger } from 'koishi';
import { TopicInfo, SearchResult } from './types';
import { Config } from './config';
export declare function createRenderer(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void): {
    renderCard: (info: TopicInfo, parent?: TopicInfo) => Promise<Buffer<ArrayBufferLike>>;
    renderSearchResults: (keyword: string, results: SearchResult[]) => Promise<Buffer<ArrayBufferLike>>;
    renderReadPages: (info: TopicInfo) => Promise<{
        pages: Buffer<ArrayBufferLike>[];
        extraImages: string[];
    }>;
};
