"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  assetVersion, designAssets, loadAssets, missingAssets, renderFlagSvg, subscribeAssets, svgDataUri, type FlagDesign,
} from "@/lib/flag";

const images = new Map<string, string>();

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
  original = false,
  large = false,
  className = "",
}: {
  spec: FlagDesign;
  iso?: string;
  original?: boolean;
  large?: boolean;
  className?: string;
}) {
  const src = useFlagImage(spec);
  if (original && iso && iso !== "-99")
    return <span aria-label={`${iso} flag`} role="img" className={`nation-flag fi fi-${iso.toLowerCase()} ${large ? "large" : ""} ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Custom national flag" draggable={false} className={`nation-flag ${large ? "large" : ""} ${className}`} />;
}
