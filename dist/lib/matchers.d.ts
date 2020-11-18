export interface Matcher {
    make(key: string, fix: any): MatchValue | undefined;
    scan(mvs: MatchValue[], opts?: any): ScanResult;
}
export interface ScanResult {
    complete: boolean;
    sound: boolean;
    gaps: any[];
    overs: any[];
    why?: string;
}
export interface MatchValue {
    match(val: any): boolean;
    same(mv: MatchValue | undefined): boolean;
    kind: string;
    fix: any;
    meta: any;
    keymap?: any;
}
export declare class GexMatcher implements Matcher {
    constructor();
    make(key: string, fix: any): {
        kind: string;
        match: (val: any) => boolean;
        fix: string;
        meta: {};
        same(mv: MatchValue): boolean;
    } | undefined;
    scan(mvs: MatchValue[], opts?: any): ScanResult;
}
export declare class IntervalMatcher implements Matcher {
    #private;
    kind: string;
    constructor();
    static normop: (op: string) => string | null;
    make(key: string, fix: any): {
        kind: string;
        fix: string;
        meta: {
            jo: string;
            o0: string;
            n0: number;
            o1: string;
            n1: number;
        };
        match: (val: any) => boolean;
        same(mv: MatchValue): boolean;
    } | undefined;
    scan(mvs: MatchValue[], opts?: any): ScanResult;
    half_intervals(mvs: MatchValue[]): any[];
}
