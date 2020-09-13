export interface Matcher {
    make(key: string, fix: any): MatchValue | null;
}
export interface MatchValue {
    match(val: any): boolean;
}
export declare class GexMatcher implements Matcher {
    constructor();
    make(key: string, fix: any): {
        match: (val: any) => boolean;
    } | null;
}
export declare class IntervalMatcher implements Matcher {
    #private;
    constructor();
    make(key: string, fix: any): {
        match: (val: any) => any;
    } | null;
}
