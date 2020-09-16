export interface Matcher {
    make(key: string, fix: any): MatchValue | undefined;
}
export interface MatchValue {
    match(val: any): boolean;
    kind: string;
    val$?: any;
}
export declare class GexMatcher implements Matcher {
    constructor();
    make(key: string, fix: any): {
        kind: string;
        match: (val: any) => boolean;
    } | undefined;
}
export declare class IntervalMatcher implements Matcher {
    #private;
    kind: string;
    constructor();
    make(key: string, fix: any): {
        kind: string;
        match: (val: any) => boolean;
    } | undefined;
}
