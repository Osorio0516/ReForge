/** Display formatting only: the database and Admin edit values stay intact. */
export function cleanDescription(value: string): string {
  return (value || "")
    .replace(/\s*Manufacturer source(?:\s*\([^)]*\))?\s*:\s*https?:\/\/\S+/gi, "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/https?:\/\/[^\s<>]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
