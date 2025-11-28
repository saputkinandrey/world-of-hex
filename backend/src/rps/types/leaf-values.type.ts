export type LeafValues<T> = T extends string
    ? T
    : { [K in keyof T]: LeafValues<T[K]> }[keyof T];
