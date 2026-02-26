import { Context, Logger } from 'koishi';
import { Config } from './config';
import { createApi } from './api';
import { createRenderer } from './renderer';
export declare function registerCommands(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void, api: ReturnType<typeof createApi>, renderer: ReturnType<typeof createRenderer>): void;
