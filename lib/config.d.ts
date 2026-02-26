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
    debug: boolean;
    enableFallback: boolean;
}
