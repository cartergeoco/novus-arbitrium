/** Natural Earth admin-0 holdings that belong on their suzerain's map. */
export const DEPENDENCIES: Record<string, string> = {
  PRI: "USA", GUM: "USA", ASM: "USA", MNP: "USA", VIR: "USA", UMI: "USA",
  GRL: "DNK", FRO: "DNK",
  AIA: "GBR", BMU: "GBR", CYM: "GBR", FLK: "GBR", GGY: "GBR",
  IMN: "GBR", IOT: "GBR", JEY: "GBR", MSR: "GBR", PCN: "GBR",
  SHN: "GBR", SGS: "GBR", TCA: "GBR", VGB: "GBR", GIB: "GBR",
  NCL: "FRA", PYF: "FRA", SPM: "FRA", WLF: "FRA", MAF: "FRA",
  BLM: "FRA", ATF: "FRA", REU: "FRA", MYT: "FRA", GLP: "FRA", MTQ: "FRA",
  ABW: "NLD", CUW: "NLD", SXM: "NLD", BES: "NLD",
  COK: "NZL", NIU: "NZL", TKL: "NZL",
  HMD: "AUS", NFK: "AUS", IOA: "AUS", ATC: "AUS", CXR: "AUS", CCK: "AUS",
  HKG: "CHN", MAC: "CHN",
  ALD: "FIN",
};

export const holdingName = (id: string) => ({
  PRI: "Puerto Rico", GRL: "Greenland", FRO: "Faroe Islands",
} as Record<string, string>)[id];
