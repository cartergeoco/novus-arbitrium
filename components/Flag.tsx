"use client";
import { useEffect, useMemo, useSyncExternalStore, type CSSProperties } from "react";
import {
  assetVersion, designAssets, loadAssets, missingAssets, renderFlagSvg, subscribeAssets, svgDataUri, type FlagDesign,
} from "@/lib/flag";
import { flagRatio } from "@/lib/flag/ratios";

const images = new Map<string, string>();

/** ISO 3166-1 SVGs from iso3166-flags. Every file is drawn on a 4:3 canvas. */
const ISO_RATIO = 4 / 3;

/** Nations with no ISO 3166-1 flag. Public-domain SVGs. */
const extraFlags: Record<string, string> = {
  SOL: "/flags/sol.svg",
  CYN: "/flags/cyn.svg",
};

/** Data URI for a design; re-renders once any library artwork it uses has loaded. */
export function useFlagImage(design: FlagDesign) {
  const version = useSyncExternalStore(subscribeAssets, assetVersion, assetVersion);
  const key = useMemo(() => JSON.stringify(design), [design]);
  useEffect(() => {
    const needed = missingAssets(designAssets(design));
    if (needed.length) void loadAssets(needed);
  }, [key, design]);
  return useMemo(() => {
    const pending = missingAssets(designAssets(design)).length > 0;
    const cacheKey = pending ? `${version}:${key}` : key;
    let uri = images.get(cacheKey);
    if (!uri) {
      uri = svgDataUri(renderFlagSvg(design));
      if (images.size > 600) images.delete(images.keys().next().value!);
      images.set(cacheKey, uri);
    }
    return uri;
  }, [key, version, design]);
}

export default function Flag({
  spec,
  iso,
  id,
  original = false,
  large = false,
  className = "",
}: {
  spec: FlagDesign;
  iso?: string;
  id?: string;
  original?: boolean;
  large?: boolean;
  className?: string;
}) {
  const src = useFlagImage(spec);
  const extra = id ? extraFlags[id] : undefined;
  const code = iso?.toLowerCase();
  const official = Boolean(original && code && code !== "-99");
  const ratio = extra ? (id === "SOL" ? 2 : 3 / 2) : official && code === "np" ? flagRatio(code) : official ? ISO_RATIO : 2;
  const shape = `nation-flag${code === "np" ? " flag-pennant" : ""} ${large ? "large" : ""} ${className}`;
  const style = { "--flag-ratio": ratio } as CSSProperties;
  if (original && extra)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={extra} alt="" draggable={false} className={shape} style={style} />;
  if (official && code)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/flags/iso/${code}.svg`} alt="" draggable={false} className={shape} style={style} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Custom national flag" draggable={false} className={shape} style={style} />;
}
