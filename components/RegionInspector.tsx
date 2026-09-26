"use client";
import { area, feature } from "@turf/turf";
import { ArrowLeft, X } from "@phosphor-icons/react";
import type { Campaign, Nation } from "@/lib/game";
import { number } from "@/lib/game";
import { regionType, type RegionView } from "@/lib/world-regions";
import Flag from "./Flag";

export function RegionInspector({ campaign, region, flag, fallbackNation, onBack, onClose }: {
  campaign: Campaign;
  region: RegionView;
  flag?: string;
  fallbackNation: Nation;
  onBack: (nationId: string) => void;
  onClose: () => void;
}) {
  const { owner, controller, unrest, damage } = region.state;
  const holder = campaign.nations[controller || owner];
  const legal = campaign.nations[owner];
  const suzerain = campaign.nations[legal?.suzerain || owner] || fallbackNation;
  const share = holder ? Math.min(1, area(feature(region.geometry)) / Math.max(1, area(feature(holder.geometry)))) : 0;
  const climate = region.state.politicalClimate || (controller !== owner ? "Occupation" : unrest >= 65 ? "Separatism" : "Settled");

  return <div className="region-inspector" aria-label="Region overview">
    <div className="region-inspector-nav">
      <button type="button" className="region-back" onClick={() => onBack(suzerain.id)} aria-label={`Back to ${suzerain.name}`}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        <Flag spec={suzerain.flag} iso={suzerain.iso} id={suzerain.id} original={suzerain.original} />
        <span>{suzerain.name}</span>
      </button>
      <button className="mobile-close icon-button" aria-label="Close region panel" onClick={onClose}><X /></button>
    </div>
    <div className="region-inspector-heading">
      {flag && <img src={flag} alt={`Flag of ${region.properties.name}`} decoding="async" fetchPriority="high" />}
      <div>
        <h2>{region.state.identity || region.properties.name}</h2>
        <span>{regionType(region)}</span>
      </div>
    </div>
    {controller !== owner && holder && <p className="region-occupier">Occupied by {holder.name}</p>}
    {holder ? <>
      <div className="region-inspector-stats">
        <div><span>Population</span><b>{number(Math.round(holder.population * share))}</b></div>
        <div><span>Economy</span><b>${number(Math.round(holder.gdp * 1000000 * share))}</b></div>
        <div><span>Unrest</span><b>{unrest}%</b></div>
        <div><span>Damage</span><b>{damage}%</b></div>
      </div>
      <p className="region-inspector-caption">Political climate: {climate}. Figures are campaign estimates allocated by land area.</p>
    </> : <p className="region-inspector-caption">This land has no country, identity, population, economy, or campaign conditions.</p>}
  </div>;
}
