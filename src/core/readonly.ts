/** Read-only access to nested plain domain data. */
export type DeepReadonly<T> = T extends string | number | boolean | null | undefined
  ? T
  : { readonly [Key in keyof T]: DeepReadonly<T[Key]> };
