// Newest first. Works via a plain string comparison because codes are a
// fixed-width, zero-padded number after the prefix (`NB-0001`, `NB-0002`,
// ...) — the same property `discoverStoryFilenames`'s own ascending sort
// already relies on, just applied in the opposite direction here. Mutates
// and returns the same array (matches `Array.prototype.sort`'s own
// contract) — callers that need the original order preserved should pass a
// copy.
export function sortStoriesNewestFirst<T extends { code: string }>(stories: T[]): T[] {
  return stories.sort((a, b) => b.code.localeCompare(a.code))
}
