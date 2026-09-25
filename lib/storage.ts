import { get, set, del, keys } from "idb-keyval";
import type { Campaign } from "./game";
import { parseCampaign } from "./validation";
export const saveCampaign = (c: Campaign) => set("campaign:" + c.id, c);
export const deleteCampaign = (id: string) => del("campaign:" + id);
export async function campaigns(): Promise<Campaign[]> {
  const all = await keys();
  const values = await Promise.all(
    all
      .filter((k) => String(k).startsWith("campaign:"))
      .map((k) => get<Campaign>(k)),
  );
  return values
    .map((x) => parseCampaign(x))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
