export interface Matcher {
    make(key: string, fix: any): MatchValue | undefined;
    complete(mvs: MatchValue[], opts?: any): Completion;
}
export interface Completion {
    ok: boolean;
    gaps: any[];
    why?: string;
}
export interface MatchValue {
    match(val: any): boolean;
    kind: string;
    fix: any;
    meta: any;
    val$?: any;
}
export declare class GexMatcher implements Matcher {
    constructor();
    make(key: string, fix: any): {
        kind: string;
        match: (val: any) => boolean;
        fix: string;
        meta: {};
    } | undefined;
    complete(mvs: MatchValue[], opts?: any): {
        ok: boolean;
        gaps: never[];
        why: string;
    };
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
    } | undefined;
    complete(mvs: MatchValue[], opts?: any): {
        ok: boolean;
        gaps: any[];
        overs: any[];
        lower: null;
        upper: null;
    };
    half_intervals(mvs: MatchValue[]): any[];
}
