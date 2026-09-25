import { deriveFlag as derive, nationalFlag, type FlagDesign } from "./flag";

export { flagSchema, flagInputSchema, makeFlag } from "./flag";
/** A nation's flag. Kept under the historical name used across the game. */
export type FlagSpec = FlagDesign;

export function heritageFlag(id: string): FlagSpec | undefined {
  return nationalFlag(id);
}

/** A new layout that inherits the parent's palette, symbols and patterns. */
export function deriveFlag(base: FlagSpec, seed: string): FlagSpec {
  return derive(base, seed);
}

const families: [RegExp, string][] = [
  [/monarch|kingdom|sultan|emir|empire|tsar|kaiser|shah/i, "monarchy"],
  [/theocr|papal|caliph|ayatollah/i, "theocracy"],
  [/one-party|communist|junta|military council/i, "party"],
  [/republic|democra|federal|constitutional|parliament|presidential|council/i, "republic"],
];

function polityFamily(text: string) {
  return families.find(([pattern]) => pattern.test(text))?.[1] || "other";
}

/** A breakaway keeps the parent's constitutional family unless it already shares that family. */
export function derivePolity(
  parent: { ideology: string; government?: string },
  proposed?: { ideology?: string; government?: string },
) {
  const parentText = `${parent.ideology} ${parent.government || ""}`;
  const proposedText = `${proposed?.ideology || ""} ${proposed?.government || ""}`.trim();
  const sameFamily = !proposedText || polityFamily(parentText) === "other" || polityFamily(proposedText) === polityFamily(parentText) || polityFamily(proposedText) === "other";
  if (!sameFamily) return { ideology: parent.ideology, government: parent.government || "Unspecified" };
  return {
    ideology: proposed?.ideology || parent.ideology,
    government: proposed?.government || parent.government || "Unspecified",
  };
}
