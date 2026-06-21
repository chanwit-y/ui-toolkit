export type ClassValue = string | number | false | null | undefined

/** Join conditional class names into a single string, dropping falsy values. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
