import { Context, Schema } from 'koishi';
export declare const name = "fimtale-watcher";
export declare const inject: string[];
declare module 'koishi' {
    interface Tables {
        fimtale_subs: FimtaleSub;
    }
}
export interface FimtaleSub {
    id: number;
    cid: string;
    threadId: string;
    lastCount: number;
    lastCheck: number;
}
export interface Config {
    apiUrl: string;
    apiKey: string;
    apiPass: string;
    cookies: string;
    pollInterval: number;
    autoParseLink: boolean;
    deviceWidth: number;
    deviceHeight: number;
    fontSize: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
