"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { FeatureCollection } from "geojson";
import type { Nation } from "@/lib/game";
import type { RegionView } from "@/lib/world-regions";
import { labelVisible, MAP_MAX_ZOOM, MAP_MIN_ZOOM, waterLabels, waterLines } from "@/lib/waters";
import { bbox } from "@turf/turf";

function shiftCoords(coords: unknown, delta: number): unknown {
  if (!Array.isArray(coords)) return coords;
  if (typeof coords[0] === "number") return [coords[0] + delta, coords[1]];
  return coords.map((item) => shiftCoords(item, delta));
}

function shiftGeometry<T extends { coordinates?: unknown }>(geometry: T, delta: number): T {
  if (!delta || !geometry.coordinates) return geometry;
  return { ...geometry, coordinates: shiftCoords(geometry.coordinates, delta) };
}

type PolyCoords = number[][][];

function ringBoundsX(ring: number[][]) {
  let min = 180;
  let max = -180;
  for (const point of ring) {
    if (point[0] < min) min = point[0];
    if (point[0] > max) max = point[0];
  }
  return [min, max] as const;
}

function uniqueCount(ring: number[][]) {
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  return closed ? ring.length - 1 : ring.length;
}

/** Walk from `start` to `end`, skipping the direct seam edge between them. */
function chainExcludingEdge(ring: number[][], start: number, end: number) {
  const count = uniqueCount(ring);
  const chain: number[][] = [];
  let index = start;
  while (true) {
    chain.push(ring[index]);
    if (index === end) break;
    index = (index + 1) % count;
    if (chain.length > count) break;
  }
  return chain;
}

function seamPair(ring: number[][], longitude: number) {
  const count = uniqueCount(ring);
  const hits: number[] = [];
  for (let index = 0; index < count; index++) {
    if (Math.abs(ring[index][0] - longitude) < 1e-4) hits.push(index);
  }
  if (hits.length !== 2) return null;
  const [first, second] = hits;
  const adjacent =
    (first + 1) % count === second || (second + 1) % count === first;
  if (!adjacent) return null;
  const start = (first + 1) % count === second ? second : first;
  const end = start === second ? first : second;
  return chainExcludingEdge(ring, start, end);
}

/** Polygons split on the antimeridian share a straight edge at ±180. Stitch each pair so that edge is not drawn through the country. */
function joinAntimeridian<T extends { type?: string; coordinates?: unknown }>(geometry: T): T {
  if (!geometry?.coordinates || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return geometry;
  const polygons: PolyCoords[] = geometry.type === "Polygon" ? [geometry.coordinates as PolyCoords] : [...(geometry.coordinates as PolyCoords[])];
  const west = new Map<string, number>();
  const shiftedWest = new Set<number>();
  polygons.forEach((coords, index) => {
    const [min, max] = ringBoundsX(coords[0] || []);
    if (min <= -179.9 && max < 179.9) {
      const shifted = shiftCoords(coords, 360) as PolyCoords;
      const chain = seamPair(shifted[0], 180);
      if (chain) west.set(chain[0][1] + ":" + chain[chain.length - 1][1], index);
      shiftedWest.add(index);
      polygons[index] = shifted;
    }
  });
  if (!west.size) return geometry;
  const used = new Set<number>();
  const stitched: PolyCoords[] = [];
  polygons.forEach((coords, index) => {
    if (used.has(index) || shiftedWest.has(index)) return;
    const [min] = ringBoundsX(coords[0] || []);
    const chain = min > 0 ? seamPair(coords[0], 180) : null;
    const match = chain ? west.get(chain[chain.length - 1][1] + ":" + chain[0][1]) : undefined;
    if (chain && match != null && !used.has(match)) {
      const other = seamPair(polygons[match][0], 180)!;
      const ring = chain.concat(other.slice(1));
      ring.push([ring[0][0], ring[0][1]]);
      stitched.push([ring, ...coords.slice(1), ...polygons[match].slice(1)]);
      used.add(index);
      used.add(match);
      return;
    }
    stitched.push(coords);
  });
  shiftedWest.forEach((index) => {
    if (!used.has(index)) stitched.push(polygons[index]);
  });
  if (stitched.length === 1) return { ...geometry, type: "Polygon", coordinates: stitched[0] } as T;
  return { ...geometry, type: "MultiPolygon", coordinates: stitched } as T;
}

const joinedGeometries = new WeakMap<object, object>();

function continuousGeometry<T extends { type?: string; coordinates?: unknown }>(geometry: T): T {
  if (!geometry || typeof geometry !== "object") return geometry;
  const cached = joinedGeometries.get(geometry);
  if (cached) return cached as T;
  const joined = joinAntimeridian(geometry);
  joinedGeometries.set(geometry, joined);
  return joined;
}

function copiesForBounds(west: number, east: number) {
  const min = Math.floor((west + 180) / 360);
  const max = Math.floor((east + 180) / 360);
  const copies: number[] = [];
  for (let copy = min; copy <= max; copy++) copies.push(copy);
  return copies.length ? copies : [0];
}

function sameCopies(a: number[], b: number[]) {
  return a.length === b.length && a.every((copy, index) => copy === b[index]);
}

function wrapToward(viewLng: number, lng: number) {
  return lng + Math.round((viewLng - lng) / 360) * 360;
}

const MIN_ZOOM = MAP_MIN_ZOOM;
const MAX_ZOOM = MAP_MAX_ZOOM;

function gridStep(zoom: number) {
  const targetPx = Math.max(22, 108 - zoom * 12);
  const raw = (targetPx * 360) / (256 * 2 ** zoom);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const normalized = raw / magnitude;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return nice * magnitude;
}

type Props = {
  nations: Record<string, Nation>;
  selected: string;
  onSelect: (id: string) => void;
  labels: boolean;
  drawing: boolean;
  previewRing?: number[][] | null;
  onDraw: (ring: number[][]) => void;
  regions: FeatureCollection | null;
  occupations?: RegionView[];
  selectedRegion?: string | null;
  focusRegion?: RegionView | null;
  onSelectRegion?: (id: string) => void;
  focus: number;
  motion: boolean;
  decorative?: boolean;
};
export default function WorldMap(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<Leaflet.Map | null>(null),
    L = useRef<typeof Leaflet | null>(null),
    geo = useRef<Leaflet.GeoJSON | null>(null),
    labelLayer = useRef<Leaflet.LayerGroup | null>(null),
    previewLayer = useRef<Leaflet.LayerGroup | null>(null),
    regionLayer = useRef<Leaflet.GeoJSON | null>(null),
    occupationLayer = useRef<Leaflet.GeoJSON | null>(null),
    latest = useRef(props),
    initialDecorative = useRef(props.decorative);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [worldCopies, setWorldCopies] = useState<number[]>([0]);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver;
    let cleanupPan = () => {};
    (async () => {
      const leaflet = await import("leaflet");
      await import("@geoman-io/leaflet-geoman-free");
      if (cancelled || !container.current) return;
      L.current = leaflet;
      const m = leaflet.map(container.current, {
        zoomControl: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        attributionControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomSnap: 0.2,
        worldCopyJump: false,
        boxZoom: false,
        maxBounds: [
          [-85, -1e7],
          [85, 1e7],
        ],
        maxBoundsViscosity: 1,
        scrollWheelZoom: !initialDecorative.current,
        // Pan is deliberately reserved for the middle mouse button so map clicks
        // remain unambiguous when selecting nations.
        dragging: false,
        doubleClickZoom: false,
        keyboard: !initialDecorative.current,
      });
      map.current = m;
      for (const [name, zIndex] of [["novus-countries", "410"], ["novus-regions", "430"], ["novus-occupations", "440"], ["novus-preview", "450"]]) {
        m.createPane(name);
        m.getPane(name)!.style.zIndex = zIndex;
      }
      let panning = false;
      let lastPoint: [number, number] = [0, 0];
      let lastTime = 0;
      let velocity: [number, number] = [0, 0];
      let momentumFrame = 0;
      const stopMomentum = () => cancelAnimationFrame(momentumFrame);
      const startPan = (event: MouseEvent) => {
        if (latest.current.decorative || event.button !== 1) return;
        event.preventDefault();
        stopMomentum();
        panning = true;
        lastPoint = [event.clientX, event.clientY];
        lastTime = performance.now();
        velocity = [0, 0];
        container.current?.classList.add("is-panning");
      };
      const movePan = (event: MouseEvent) => {
        if (!panning) return;
        const now = performance.now();
        const dt = Math.max(1, now - lastTime);
        const dx = lastPoint[0] - event.clientX;
        const dy = lastPoint[1] - event.clientY;
        lastPoint = [event.clientX, event.clientY];
        lastTime = now;
        m.panBy([dx, dy], { animate: false });
        const blend = Math.min(1, dt / 40);
        velocity = [
          velocity[0] * (1 - blend) + (dx / dt) * blend,
          velocity[1] * (1 - blend) + (dy / dt) * blend,
        ];
      };
      const endPan = () => {
        if (!panning) return;
        panning = false;
        container.current?.classList.remove("is-panning");
        let vx = velocity[0];
        let vy = velocity[1];
        if (Math.hypot(vx, vy) < 0.04) return;
        let last = performance.now();
        const glide = (now: number) => {
          if (panning) return;
          const dt = Math.min(32, now - last);
          last = now;
          const decay = Math.pow(0.04, dt / 1000);
          vx *= decay;
          vy *= decay;
          if (Math.hypot(vx, vy) < 0.015) return;
          m.panBy([vx * dt, vy * dt], { animate: false });
          momentumFrame = requestAnimationFrame(glide);
        };
        momentumFrame = requestAnimationFrame(glide);
      };
      const blockMiddleClick = (event: MouseEvent) => {
        if (event.button === 1) event.preventDefault();
      };
      container.current.addEventListener("mousedown", startPan);
      container.current.addEventListener("auxclick", blockMiddleClick);
      window.addEventListener("mousemove", movePan);
      window.addEventListener("mouseup", endPan);
      cleanupPan = () => {
        stopMomentum();
        container.current?.removeEventListener("mousedown", startPan);
        container.current?.removeEventListener("auxclick", blockMiddleClick);
        window.removeEventListener("mousemove", movePan);
        window.removeEventListener("mouseup", endPan);
      };
      m.fitBounds(
        [
          [-57, -160],
          [79, 180],
        ],
        { padding: [20, 20] },
      );
      m.createPane("novus-grid");
      const gridPane = m.getPane("novus-grid")!;
      gridPane.style.zIndex = "390";
      gridPane.style.pointerEvents = "none";
      const gridCanvas = document.createElement("canvas");
      gridCanvas.className = "novus-grid-canvas";
      gridCanvas.style.position = "absolute";
      gridCanvas.style.pointerEvents = "none";
      gridPane.appendChild(gridCanvas);
      const drawGrid = () => {
        const size = m.getSize();
        const dpr = window.devicePixelRatio || 1;
        gridCanvas.width = Math.max(1, size.x * dpr);
        gridCanvas.height = Math.max(1, size.y * dpr);
        gridCanvas.style.width = `${size.x}px`;
        gridCanvas.style.height = `${size.y}px`;
        leaflet.DomUtil.setPosition(gridCanvas, m.containerPointToLayerPoint([0, 0]));
        const ctx = gridCanvas.getContext("2d");
        if (!ctx || size.x < 1 || size.y < 1) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size.x, size.y);
        const bounds = m.getBounds();
        const west = bounds.getWest();
        const east = bounds.getEast();
        const step = gridStep(m.getZoom());
        const origin = m.latLngToContainerPoint([0, 0]);
        const cell = Math.abs(m.latLngToContainerPoint([0, step]).x - origin.x);
        if (cell < 4) return;
        ctx.strokeStyle = "rgba(124, 119, 104, 0.28)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const x0 = m.latLngToContainerPoint([0, Math.floor(west / step) * step]).x;
        for (let x = x0; x <= size.x + cell; x += cell) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, size.y);
        }
        let y = origin.y % cell;
        if (y < 0) y += cell;
        for (; y <= size.y + cell; y += cell) {
          ctx.moveTo(0, y);
          ctx.lineTo(size.x, y);
        }
        ctx.stroke();
      };
      const publishCopies = () => {
        const bounds = m.getBounds().pad(0.75);
        const next = copiesForBounds(bounds.getWest(), bounds.getEast());
        setWorldCopies((prev) => (sameCopies(prev, next) ? prev : next));
        drawGrid();
      };
      m.on("move zoom resize viewreset", publishCopies);
      m.on("pm:create", (event) => {
        const layer = event.layer as Leaflet.Polygon;
        const f = layer.toGeoJSON();
        m.removeLayer(layer);
        m.pm.disableDraw();
        const ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
        latest.current.onDraw(ring);
      });
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(container.current);
      publishCopies();
      setReady(true);
    })().catch(() => setError("The map could not load. Reload to try again."));
    return () => {
      cancelled = true;
      cleanupPan();
      observer?.disconnect();
      map.current?.stop();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    const m = map.current,
      leaflet = L.current;
    geo.current?.remove();
    labelLayer.current?.remove();
    const features = worldCopies.flatMap((copy) =>
      Object.values(props.nations).map((n) => ({
        type: "Feature" as const,
        properties: { id: n.id },
        geometry: shiftGeometry(continuousGeometry(n.geometry), copy * 360),
      })),
    );
    geo.current = leaflet
      .geoJSON({ type: "FeatureCollection", features } as FeatureCollection, {
        pane: "novus-countries",
        pmIgnore: true,
        style: (f) => {
          const n = props.nations[f!.properties.id];
          const selected = n.id === props.selected;
          return {
            color: selected ? "#ffdd00" : "#171714",
            weight: selected ? 1.7 : 0.7,
            fillColor: n.color,
            fillOpacity: props.decorative ? 0.55 : selected ? 0.93 : 0.82,
          };
        },
        onEachFeature: (f, layer) => {
          const n = props.nations[f.properties.id];
          const tip = document.createElement("span");
          tip.textContent = n.name;
          layer.bindTooltip(tip, {
            className: "country-tooltip",
            sticky: true,
            direction: "top",
          });
          layer.on("click", () => {
            const node = (layer as Leaflet.Path).getElement();
            (node as HTMLElement | null)?.blur();
            if (!latest.current.drawing && !latest.current.decorative)
              latest.current.onSelect(n.id);
          });
          layer.on("mouseover", () => {
            if (n.id !== latest.current.selected)
              (layer as Leaflet.Path).setStyle({
                weight: 1.6,
                color: "#c9cbbf",
                fillOpacity: 1,
              });
          });
          layer.on("mouseout", () =>
            geo.current?.resetStyle(layer as Leaflet.Path),
          );
        },
      })
      .addTo(m);
    labelLayer.current = leaflet.layerGroup().addTo(m);
    if (!props.decorative)
      for (const copy of worldCopies) {
        const shift = copy * 360;
        if (props.labels)
          for (const n of Object.values(props.nations)) {
            const selected = n.id === props.selected;
            const label = document.createElement("span");
            label.textContent =
              n.name === "United States of America"
                ? "UNITED STATES"
                : n.name.toUpperCase();
            const marker = leaflet
              .marker([n.center[0], n.center[1] + shift], {
                icon: leaflet.divIcon({
                  html: label,
                  className: `map-label ${selected ? "selected-label" : ""}`,
                  iconSize: [130, 16],
                  iconAnchor: [65, 8],
                }),
                interactive: false,
                keyboard: false,
                pmIgnore: true,
              })
              .addTo(labelLayer.current);
            const root = marker.getElement();
            if (root) {
              root.dataset.pop = String(n.population);
              root.dataset.selected = selected ? "1" : "0";
              root.style.opacity = labelVisible(m.getZoom(), n.population, selected) ? "1" : "0";
            }
          }
        if (props.labels)
          for (const water of waterLabels) {
            const label = document.createElement("span");
            waterLines(water.name).forEach((line, index) => {
              if (index) label.appendChild(document.createElement("br"));
              label.appendChild(document.createTextNode(line));
            });
            const marker = leaflet.marker([water.lat, water.lng + shift], {
              icon: leaflet.divIcon({
                html: label,
                className: "map-label map-water-label",
                iconSize: [156, 32],
                iconAnchor: [78, 16],
              }),
              interactive: false,
              keyboard: false,
              pmIgnore: true,
            }).addTo(labelLayer.current);
            const root = marker.getElement();
            if (root) {
              root.dataset.pop = String(water.weight);
              root.dataset.selected = "0";
              root.style.opacity = labelVisible(m.getZoom(), water.weight) ? "1" : "0";
            }
          }
      }
  }, [
    ready,
    worldCopies,
    props.nations,
    props.selected,
    props.labels,
    props.decorative,
  ]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;
    const fade = () => {
      const zoom = m.getZoom();
      container.current?.querySelectorAll<HTMLElement>(".map-label").forEach((el) => {
        el.style.opacity = labelVisible(zoom, Number(el.dataset.pop || 0), el.dataset.selected === "1")
          ? "1"
          : "0";
      });
    };
    m.on("zoom", fade);
    fade();
    return () => {
      m.off("zoom", fade);
    };
  }, [ready, worldCopies, props.labels, props.selected, props.nations]);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    regionLayer.current?.remove();
    if (props.regions?.features.length)
      regionLayer.current = L.current
        .geoJSON({
          type: "FeatureCollection",
          features: worldCopies.flatMap((copy) =>
            props.regions!.features.map((feature) => ({
              ...feature,
              geometry: shiftGeometry(continuousGeometry(feature.geometry as { type?: string; coordinates?: unknown }), copy * 360),
            })),
          ),
        } as FeatureCollection, {
          pane: "novus-regions",
          pmIgnore: true,
          style: (f) => ({
            color: f?.properties?.id === props.selectedRegion ? "#ffdd00" : "#c5ad55",
            weight: f?.properties?.id === props.selectedRegion ? 2 : 0.8,
            fillColor: "#ffdd00",
            fillOpacity: f?.properties?.id === props.selectedRegion ? 0.2 : 0.02,
            opacity: 0.8,
          }),
          onEachFeature: (f, l) => {
            const el = document.createElement("span");
            el.textContent = f.properties.name + (f.properties.controller !== f.properties.country ? " · occupied" : "");
            l.bindTooltip(el, { className: "country-tooltip", sticky: true });
            l.on("click", (event) => {
              L.current?.DomEvent.stopPropagation(event.originalEvent);
              ((l as Leaflet.Path).getElement() as HTMLElement | null)?.blur();
              latest.current.onSelectRegion?.(f.properties.id);
            });
          },
        })
        .addTo(map.current);
  }, [ready, worldCopies, props.regions, props.selectedRegion]);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    occupationLayer.current?.remove();
    if (!props.occupations?.length) return;
    occupationLayer.current = L.current.geoJSON({
      type: "FeatureCollection",
      features: worldCopies.flatMap((copy) =>
        props.occupations!.map((region) => ({
          type: "Feature" as const,
          geometry: shiftGeometry(continuousGeometry(region.geometry), copy * 360),
          properties: { id: region.properties.id },
        })),
      ),
    } as FeatureCollection, {
      pane: "novus-occupations",
      pmIgnore: true,
      interactive: false,
      style: { color: "#ffdd00", weight: 1.4, dashArray: "5 4", fillColor: "#ffdd00", fillOpacity: 0.22 },
    }).addTo(map.current);
  }, [ready, worldCopies, props.occupations]);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    previewLayer.current?.remove();
    if (props.previewRing) {
      previewLayer.current = L.current.layerGroup().addTo(map.current);
      for (const copy of worldCopies)
        L.current
          .polygon(
            props.previewRing.map((p) => [p[1], p[0] + copy * 360] as [number, number]),
            {
              pane: "novus-preview",
              color: "#ffdd00",
              weight: 2,
              fillColor: "#ffdd00",
              fillOpacity: 0.2,
              pmIgnore: true,
              interactive: false,
            },
          )
          .addTo(previewLayer.current);
    }
  }, [ready, worldCopies, props.previewRing]);
  useEffect(() => {
    if (!ready || !map.current) return;
    if (props.drawing)
      map.current.pm.enableDraw("Polygon", {
        snappable: true,
        allowSelfIntersection: false,
        templineStyle: { color: "#ffdd00" },
        hintlineStyle: { color: "#ffdd00", dashArray: [5, 5] },
        pathOptions: { color: "#ffdd00", fillOpacity: 0.2 },
      });
    else map.current.pm.disableDraw();
  }, [ready, props.drawing]);
  useEffect(() => {
    if (!ready || !props.focus || !map.current) return;
    const n = latest.current.nations[latest.current.selected];
    if (n)
      map.current.setView(
        [n.center[0], wrapToward(map.current.getCenter().lng, n.center[1])],
        map.current.getSize().x < 700 ? 2.6 : 3.8,
        { animate: !latest.current.motion },
      );
  }, [ready, props.focus]);
  useEffect(() => {
    const region = latest.current.focusRegion;
    if (!ready || !map.current || !region) return;
    const bounds = bbox(region);
    const width = map.current.getSize().x;
    const mid = (bounds[0] + bounds[2]) / 2;
    const delta = Math.round((map.current.getCenter().lng - mid) / 360) * 360;
    map.current.fitBounds([[bounds[1], bounds[0] + delta], [bounds[3], bounds[2] + delta]], {
      paddingTopLeft: width > 900 ? [310, 90] : [24, 80],
      paddingBottomRight: width > 900 ? [310, 300] : [24, 270],
      maxZoom: 5.5, animate: !latest.current.motion,
    });
  }, [ready, props.focusRegion?.properties.id]);
  return (
    <div className={`map-wrap ${props.decorative ? "decorative-map" : ""}`}>
      <div className="leaflet-map" ref={container} />
      {!ready && (
        <div className="map-loading">{error || "Charting the world…"}</div>
      )}
    </div>
  );
}
