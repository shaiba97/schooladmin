/**
 * Mirrors the backend's `common/text/text.util.ts`: capitalise the first
 * letter of each word, leave the rest alone so existing capitals and internal
 * punctuation (O'Brien, McDonald) survive. Applied on display so records
 * written before the backend started normalising still read correctly.
 */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
