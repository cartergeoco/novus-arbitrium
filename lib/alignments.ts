type Aligned = { allies?: string[]; rivals?: string[] };

/** Formal mutual-defense groups. Members are allies of every other member present in the world. */
const alliances = [
  // North Atlantic Treaty, 32 members as of 2024. https://www.nato.int/en/about-us/organization/nato-member-countries
  ["ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD", "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR", "GBR", "USA"],
  // Collective Security Treaty Organization. Uzbekistan is not a member.
  ["ARM", "BLR", "KAZ", "KGZ", "RUS", "TJK"],
  // GCC Peninsula Shield joint defense agreement.
  ["SAU", "ARE", "BHR", "KWT", "OMN", "QAT"],
  // Five Power Defence Arrangements.
  ["AUS", "MYS", "NZL", "SGP", "GBR"],
];

/** Bilateral mutual-defense treaties that are not covered by a group above. */
const bilateralAllies: [string, string][] = [
  ["USA", "JPN"],
  ["USA", "KOR"],
  ["USA", "AUS"],
  ["USA", "PHL"],
  ["USA", "THA"],
];

/**
 * Mutual rivalries that are wars, armistices, or long-running state adversaries.
 * A pair is skipped when those countries are already allies.
 */
const rivalries: [string, string][] = [
  ["RUS", "UKR"],
  ["BLR", "UKR"],
  ["RUS", "GEO"],
  ["CHN", "TWN"],
  ["CHN", "IND"],
  ["CHN", "USA"],
  ["USA", "RUS"],
  ["USA", "PRK"],
  ["USA", "IRN"],
  ["PRK", "KOR"],
  ["PRK", "JPN"],
  ["IND", "PAK"],
  ["ARM", "AZE"],
  ["ISR", "IRN"],
  ["ISR", "SYR"],
  ["ISR", "PSX"],
  ["SAU", "IRN"],
  ["SAU", "YEM"],
  ["MAR", "DZA"],
  ["SRB", "KOS"],
  ["SDN", "SDS"],
  ["ERI", "ETH"],
];

const nato = alliances[0];

export const factions: { id: string; name: string; kind: "Alliance" | "Organization"; members: string[] }[] = [
  { id: "nato", name: "NATO", kind: "Alliance", members: alliances[0] },
  { id: "csto", name: "CSTO", kind: "Alliance", members: alliances[1] },
  { id: "gcc", name: "Gulf Cooperation Council", kind: "Alliance", members: alliances[2] },
  { id: "fpda", name: "Five Power Defence Arrangements", kind: "Alliance", members: alliances[3] },
  { id: "eu", name: "European Union", kind: "Organization", members: ["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"] },
  { id: "asean", name: "ASEAN", kind: "Organization", members: ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"] },
  { id: "au", name: "African Union", kind: "Organization", members: ["DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COG", "COD", "CIV", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH", "GAB", "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA", "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN", "UGA", "ZMB", "ZWE"] },
  { id: "brics", name: "BRICS", kind: "Organization", members: ["BRA", "RUS", "IND", "CHN", "ZAF"] },
];

function addAlly(nations: Record<string, Aligned>, a: string, b: string) {
  const left = nations[a];
  const right = nations[b];
  if (!left || !right || a === b) return;
  left.allies = [...new Set([...(left.allies || []), b])];
  right.allies = [...new Set([...(right.allies || []), a])];
}

function addRival(nations: Record<string, Aligned>, a: string, b: string) {
  const left = nations[a];
  const right = nations[b];
  if (!left || !right || a === b) return;
  if (left.allies?.includes(b) || right.allies?.includes(a)) return;
  left.rivals = [...new Set([...(left.rivals || []), b])];
  right.rivals = [...new Set([...(right.rivals || []), a])];
}

export function applyAlignments(nations: Record<string, Aligned>) {
  for (const group of alliances) {
    for (const id of group) for (const other of group) addAlly(nations, id, other);
  }
  for (const [a, b] of bilateralAllies) addAlly(nations, a, b);
  for (const ally of nato) addRival(nations, "RUS", ally);
  for (const [a, b] of rivalries) addRival(nations, a, b);
}
