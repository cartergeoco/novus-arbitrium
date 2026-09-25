/** Zoom range shared with country titles. Larger weights appear from farther out. */
export const MAP_MIN_ZOOM = 3.6;
export const MAP_MAX_ZOOM = 6;

const ocean = 1_000_000_000;

export type WaterLabel = {
  name: string;
  lat: number;
  lng: number;
  /** Same role as a country's population for the zoom fade. */
  weight: number;
};

/**
 * Named water that is actually open on the country map. Inland lakes painted
 * over by a country fill are omitted. Weights are approximate areas in km²,
 * except the oceans, which stay visible at the widest view.
 */
export const waterLabels: WaterLabel[] = [
  { name: "North Pacific Ocean", lat: 32, lng: -155, weight: ocean },
  { name: "North Pacific Ocean", lat: 34, lng: 168, weight: ocean },
  { name: "South Pacific Ocean", lat: -30, lng: -140, weight: ocean },
  { name: "South Pacific Ocean", lat: -32, lng: 168, weight: ocean },
  { name: "North Atlantic Ocean", lat: 40, lng: -40, weight: ocean },
  { name: "South Atlantic Ocean", lat: -28, lng: -18, weight: ocean },
  { name: "Indian Ocean", lat: -20, lng: 78, weight: ocean },
  { name: "Arctic Ocean", lat: 82, lng: 20, weight: ocean },
  { name: "Southern Ocean", lat: -62, lng: 30, weight: ocean },
  { name: "Southern Ocean", lat: -62, lng: 140, weight: ocean },
  { name: "Southern Ocean", lat: -62, lng: -150, weight: ocean },

  { name: "Philippine Sea", lat: 20, lng: 133, weight: 5_000_000 },
  { name: "Coral Sea", lat: -16, lng: 155, weight: 4_800_000 },
  { name: "Arabian Sea", lat: 16, lng: 64, weight: 3_860_000 },
  { name: "South China Sea", lat: 12, lng: 114, weight: 3_500_000 },
  { name: "Weddell Sea", lat: -72, lng: -40, weight: 2_800_000 },
  { name: "Caribbean Sea", lat: 15, lng: -74, weight: 2_750_000 },
  { name: "Mediterranean Sea", lat: 35.5, lng: 18, weight: 2_500_000 },
  { name: "Tasman Sea", lat: -38, lng: 162, weight: 2_300_000 },
  { name: "Bay of Bengal", lat: 15, lng: 88, weight: 2_170_000 },
  { name: "Bering Sea", lat: 57, lng: -178, weight: 2_000_000 },
  { name: "Sea of Okhotsk", lat: 55, lng: 150, weight: 1_580_000 },
  { name: "Gulf of Mexico", lat: 25, lng: -90, weight: 1_550_000 },
  { name: "Gulf of Alaska", lat: 56, lng: -145, weight: 1_530_000 },
  { name: "Gulf of Guinea", lat: 1.5, lng: 2, weight: 1_500_000 },
  { name: "Barents Sea", lat: 75, lng: 40, weight: 1_400_000 },
  { name: "Norwegian Sea", lat: 68, lng: 0, weight: 1_380_000 },
  { name: "East China Sea", lat: 28.5, lng: 125, weight: 1_250_000 },
  { name: "Hudson Bay", lat: 60, lng: -85, weight: 1_230_000 },
  { name: "Greenland Sea", lat: 75, lng: -8, weight: 1_200_000 },
  { name: "Mozambique Channel", lat: -18, lng: 41, weight: 1_000_000 },
  { name: "Sea of Japan", lat: 40, lng: 135, weight: 1_000_000 },
  { name: "Great Australian Bight", lat: -33.5, lng: 130, weight: 1_000_000 },
  { name: "Ross Sea", lat: -75, lng: -175, weight: 960_000 },
  { name: "East Siberian Sea", lat: 73, lng: 160, weight: 930_000 },
  { name: "Scotia Sea", lat: -56, lng: -45, weight: 900_000 },
  { name: "Kara Sea", lat: 74, lng: 68, weight: 880_000 },
  { name: "Labrador Sea", lat: 58, lng: -55, weight: 840_000 },
  { name: "Andaman Sea", lat: 11, lng: 96, weight: 800_000 },
  { name: "Laccadive Sea", lat: 8, lng: 74, weight: 780_000 },
  { name: "Drake Passage", lat: -58, lng: -65, weight: 750_000 },
  { name: "Solomon Sea", lat: -8, lng: 154, weight: 720_000 },
  { name: "Baffin Bay", lat: 73, lng: -67, weight: 690_000 },
  { name: "Laptev Sea", lat: 76, lng: 125, weight: 660_000 },
  { name: "Arafura Sea", lat: -9, lng: 135, weight: 650_000 },
  { name: "Timor Sea", lat: -11.5, lng: 126, weight: 610_000 },
  { name: "Chukchi Sea", lat: 70, lng: -170, weight: 590_000 },
  { name: "North Sea", lat: 56.5, lng: 3.5, weight: 570_000 },
  { name: "Bellingshausen Sea", lat: -70, lng: -85, weight: 480_000 },
  { name: "Beaufort Sea", lat: 73, lng: -140, weight: 476_000 },
  { name: "Banda Sea", lat: -5.5, lng: 126.5, weight: 470_000 },
  { name: "Red Sea", lat: 20, lng: 38.2, weight: 438_000 },
  { name: "Black Sea", lat: 43.3, lng: 34, weight: 436_000 },
  { name: "Gulf of Aden", lat: 12.2, lng: 48, weight: 410_000 },
  { name: "Yellow Sea", lat: 35.5, lng: 123.5, weight: 380_000 },
  { name: "Baltic Sea", lat: 57, lng: 19, weight: 377_000 },
  { name: "Caspian Sea", lat: 41.8, lng: 50.6, weight: 371_000 },
  { name: "Java Sea", lat: -4.5, lng: 110.5, weight: 320_000 },
  { name: "Gulf of Thailand", lat: 9, lng: 101, weight: 320_000 },
  { name: "Bismarck Sea", lat: -4, lng: 148, weight: 310_000 },
  { name: "Gulf of Carpentaria", lat: -14, lng: 138, weight: 300_000 },
  { name: "Celebes Sea", lat: 3.5, lng: 122, weight: 280_000 },
  { name: "Sulu Sea", lat: 8, lng: 120, weight: 260_000 },
  { name: "Persian Gulf", lat: 26.8, lng: 51.5, weight: 251_000 },
  { name: "Gulf of St. Lawrence", lat: 48, lng: -62, weight: 226_000 },
  { name: "Bay of Biscay", lat: 45.2, lng: -4.5, weight: 223_000 },
  { name: "Aegean Sea", lat: 38.3, lng: 25.2, weight: 214_000 },
  { name: "Molucca Sea", lat: 0.5, lng: 125.5, weight: 200_000 },
  { name: "Foxe Basin", lat: 67, lng: -78, weight: 180_000 },
  { name: "Gulf of Oman", lat: 24.5, lng: 58.5, weight: 181_000 },
  { name: "Ionian Sea", lat: 36.8, lng: 18.2, weight: 169_000 },
  { name: "Gulf of California", lat: 28, lng: -112, weight: 160_000 },
  { name: "James Bay", lat: 53.5, lng: -80.5, weight: 150_000 },
  { name: "Tyrrhenian Sea", lat: 39.8, lng: 12.2, weight: 150_000 },
  { name: "Adriatic Sea", lat: 42.8, lng: 15.8, weight: 138_000 },
  { name: "Gulf of Tonkin", lat: 19.5, lng: 107.5, weight: 126_000 },
  { name: "Natuna Sea", lat: 4, lng: 108, weight: 120_000 },
  { name: "Gulf of Bothnia", lat: 62.5, lng: 19.5, weight: 117_000 },
  { name: "Levantine Sea", lat: 33.5, lng: 30, weight: 110_000 },
  { name: "Gulf of Papua", lat: -8.5, lng: 145, weight: 100_000 },
  { name: "Bristol Bay", lat: 57.2, lng: -161, weight: 100_000 },
  { name: "Hudson Strait", lat: 62.2, lng: -72, weight: 90_000 },
  { name: "Libyan Sea", lat: 33, lng: 22, weight: 90_000 },
  { name: "White Sea", lat: 65.6, lng: 37.5, weight: 90_000 },
  { name: "Celtic Sea", lat: 50.5, lng: -8, weight: 80_000 },
  { name: "Gulf of Maine", lat: 43, lng: -68, weight: 80_000 },
  { name: "Gulf of Honduras", lat: 16.5, lng: -86.5, weight: 80_000 },
  { name: "Bohai Sea", lat: 38.7, lng: 120, weight: 77_000 },
  { name: "English Channel", lat: 50, lng: -1.2, weight: 75_000 },
  { name: "Taiwan Strait", lat: 24.5, lng: 119.2, weight: 70_000 },
  { name: "Davis Strait", lat: 65, lng: -58, weight: 70_000 },
  { name: "Strait of Malacca", lat: 3, lng: 100.5, weight: 65_000 },
  { name: "Flores Sea", lat: -7.5, lng: 121, weight: 60_000 },
  { name: "Halmahera Sea", lat: 0, lng: 129, weight: 55_000 },
  { name: "Balearic Sea", lat: 39, lng: 2.5, weight: 50_000 },
  { name: "Gulf of Panama", lat: 7.5, lng: -79.5, weight: 50_000 },
  { name: "Bass Strait", lat: -39.5, lng: 146, weight: 50_000 },
  { name: "Korea Strait", lat: 34, lng: 129, weight: 50_000 },
  { name: "Ungava Bay", lat: 59.5, lng: -67, weight: 50_000 },
  { name: "Amundsen Gulf", lat: 70.5, lng: -122, weight: 50_000 },
  { name: "Irish Sea", lat: 53.8, lng: -4.8, weight: 46_000 },
  { name: "Denmark Strait", lat: 67, lng: -24, weight: 45_000 },
  { name: "Skagerrak", lat: 57.8, lng: 9.2, weight: 40_000 },
  { name: "Sea of Azov", lat: 46, lng: 36.8, weight: 39_000 },
  { name: "Rio de la Plata", lat: -35.4, lng: -56.2, weight: 35_000 },
  { name: "Gulf of Finland", lat: 59.8, lng: 25.5, weight: 30_000 },
  { name: "Kattegat", lat: 57, lng: 11.3, weight: 30_000 },
  { name: "Lancaster Sound", lat: 74.2, lng: -84, weight: 28_000 },
  { name: "Viscount Melville Sound", lat: 74.3, lng: -108, weight: 28_000 },
  { name: "Queen Maud Gulf", lat: 68.3, lng: -102, weight: 25_000 },
  { name: "Gulf of Boothia", lat: 70.5, lng: -91, weight: 25_000 },
  { name: "Ligurian Sea", lat: 43.4, lng: 9, weight: 22_000 },
  { name: "Norton Sound", lat: 63.8, lng: -164, weight: 20_000 },
  { name: "Seto Inland Sea", lat: 34.2, lng: 133.4, weight: 20_000 },
  { name: "Spencer Gulf", lat: -34.3, lng: 136.8, weight: 20_000 },
  { name: "Joseph Bonaparte Gulf", lat: -14, lng: 128.5, weight: 18_000 },
  { name: "Gulf of Riga", lat: 57.5, lng: 23.5, weight: 18_000 },
  { name: "Gulf of Venezuela", lat: 11.5, lng: -71, weight: 17_000 },
  { name: "Alboran Sea", lat: 36, lng: -3, weight: 15_000 },
  { name: "Lincoln Sea", lat: 83, lng: -58, weight: 15_000 },
  { name: "Lake Maracaibo", lat: 9.7, lng: -71.6, weight: 13_000 },
  { name: "Gulf of Suez", lat: 28.8, lng: 33.1, weight: 12_000 },
  { name: "Sea of Marmara", lat: 40.7, lng: 28.2, weight: 11_000 },
  { name: "Gulf of Aqaba", lat: 28.8, lng: 34.7, weight: 4_000 },
];

export function labelVisible(zoom: number, weight: number, selected = false) {
  if (selected) return true;
  const size = Math.min(1, Math.log10(Math.max(weight, 1000)) / 9);
  const visibleAt = MAP_MIN_ZOOM + (1 - size) * (MAP_MAX_ZOOM - MAP_MIN_ZOOM);
  return zoom + 0.05 >= visibleAt;
}

/** Split a water name so the generic word sits on its own line, as with ocean titles. */
export function waterLines(name: string) {
  const upper = name.toUpperCase();
  const leading = upper.match(/^(GULF OF|BAY OF|SEA OF|STRAIT OF|LAKE)\s+(.+)$/);
  if (leading) return [leading[1], leading[2]];
  const trailing = upper.match(/^(.+)\s+(OCEAN|SEA|GULF|BAY|CHANNEL|STRAIT|BIGHT|PASSAGE|BASIN|SOUND)$/);
  if (trailing) return [trailing[1], trailing[2]];
  return [upper];
}
