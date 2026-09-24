"use client";
import { IconButton } from "@/components/IconButton";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { FeatureCollection } from "geojson";
import type { Nation } from "@/lib/game";
import {
  Plus,
  Minus,
  Crosshair,
  GlobeHemisphereWest,
} from "@phosphor-icons/react";
type Props = {
  nations: Record<string, Nation>;
  selected: string;
  player?: string;
  onSelect: (id: string) => void;
  labels: boolean;
  layer: string;
  drawing: boolean;
  previewRing?: number[][] | null;
  onDraw: (ring: number[][]) => void;
  regions: FeatureCollection | null;
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
    previewLayer = useRef<Leaflet.Polygon | null>(null),
    regionLayer = useRef<Leaflet.GeoJSON | null>(null),
    latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
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
          minZoom: 0,
        maxZoom: 7,
        zoomSnap: 0.2,
        worldCopyJump: false,
        maxBounds: [
          [-85, -220],
          [85, 220],
        ],
        maxBoundsViscosity: 0.7,
        scrollWheelZoom: !props.decorative,
        // Pan is deliberately reserved for the middle mouse button so map clicks
        // remain unambiguous when selecting nations.
        dragging: false,
        doubleClickZoom: false,
        keyboard: !props.decorative,
      });
      map.current = m;
      let panning = false;
      let lastPoint: [number, number] = [0, 0];
      const startPan = (event: MouseEvent) => {
        if (props.decorative || event.button !== 1) return;
        event.preventDefault();
        panning = true;
        lastPoint = [event.clientX, event.clientY];
        container.current?.classList.add("is-panning");
      };
      const movePan = (event: MouseEvent) => {
        if (!panning) return;
        const dx = event.clientX - lastPoint[0];
        const dy = event.clientY - lastPoint[1];
        lastPoint = [event.clientX, event.clientY];
        m.panBy([dx, dy], { animate: false });
      };
      const endPan = () => {
        panning = false;
        container.current?.classList.remove("is-panning");
      };
      container.current.addEventListener("mousedown", startPan);
      window.addEventListener("mousemove", movePan);
      window.addEventListener("mouseup", endPan);
      cleanupPan = () => {
        container.current?.removeEventListener("mousedown", startPan);
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
      const grid = leaflet.layerGroup().addTo(m);
      for (let lng = -180; lng <= 180; lng += 30)
        leaflet
          .polyline(
            [
              [-80, lng],
              [85, lng],
            ],
            {
              color: "#566376",
              weight: 0.5,
              opacity: 0.13,
              interactive: false,
              pmIgnore: true,
            },
          )
          .addTo(grid);
      for (let lat = -60; lat <= 80; lat += 30)
        leaflet
          .polyline(
            [
              [lat, -180],
              [lat, 180],
            ],
            {
              color: "#566376",
              weight: 0.5,
              opacity: 0.13,
              interactive: false,
              pmIgnore: true,
            },
          )
          .addTo(grid);
      m.on("pm:create", (e: any) => {
        const f = e.layer.toGeoJSON();
        m.removeLayer(e.layer);
        m.pm.disableDraw();
        latest.current.onDraw(f.geometry.coordinates[0]);
      });
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(container.current);
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
    const features = Object.values(props.nations).map((n) => ({
      type: "Feature" as const,
      properties: { id: n.id },
      geometry: n.geometry,
    }));
    geo.current = leaflet
      .geoJSON({ type: "FeatureCollection", features } as FeatureCollection, {
        pmIgnore: true,
        style: (f) => {
          const n = props.nations[f!.properties.id];
          const selected = n.id === props.selected;
          const fill =
            props.layer === "Stability"
              ? `hsl(${n.stability * 1.4} 20% 38%)`
              : props.layer === "Relations"
                ? n.relations > 0
                  ? "#4e8276"
                  : n.relations < 0
                    ? "#955956"
                    : n.color
                : n.color;
          return {
            color: selected ? "#ffdd00" : "#101b28",
            weight: selected ? 2 : 0.7,
            fillColor: selected ? "#b3a34c" : fill,
            fillOpacity: props.decorative ? 0.55 : 0.82,
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
    if (props.labels && !props.decorative)
      for (const n of Object.values(props.nations)) {
        if (n.population < 50000000 && n.id !== props.selected) continue;
        const label = document.createElement("span");
        label.textContent =
          n.name === "United States of America"
            ? "UNITED STATES"
            : n.name.toUpperCase();
        leaflet
          .marker(n.center, {
            icon: leaflet.divIcon({
              html: label,
              className: `map-label ${n.id === props.selected ? "selected-label" : ""}`,
              iconSize: [130, 16],
              iconAnchor: [65, 8],
            }),
            interactive: false,
            keyboard: false,
            pmIgnore: true,
          })
          .addTo(labelLayer.current);
      }
  }, [
    ready,
    props.nations,
    props.selected,
    props.layer,
    props.labels,
    props.decorative,
  ]);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    regionLayer.current?.remove();
    if (props.layer === "Regions" && props.regions)
      regionLayer.current = L.current
        .geoJSON(props.regions, {
          pmIgnore: true,
          style: {
            color: "#cfbd75",
            weight: 0.8,
            fillOpacity: 0,
            opacity: 0.7,
          },
          onEachFeature: (f, l) => {
            const el = document.createElement("span");
            el.textContent = f.properties.name;
            l.bindTooltip(el, { className: "country-tooltip", sticky: true });
          },
        })
        .addTo(map.current);
  }, [ready, props.layer, props.regions]);
  useEffect(() => {
    if (!ready || !map.current || !L.current) return;
    previewLayer.current?.remove();
    if (props.previewRing)
      previewLayer.current = L.current
        .polygon(
          props.previewRing.map((p) => [p[1], p[0]] as [number, number]),
          {
            color: "#ffdd00",
            weight: 2,
            fillColor: "#ffdd00",
            fillOpacity: 0.2,
            pmIgnore: true,
            interactive: false,
          },
        )
        .addTo(map.current);
  }, [ready, props.previewRing]);
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
    const n = props.nations[props.selected];
    if (n)
      map.current.setView(n.center, map.current.getSize().x < 700 ? 2.6 : 3.8, {
        animate: !props.motion,
      });
  }, [ready, props.focus]);
  return (
    <div className={`map-wrap ${props.decorative ? "decorative-map" : ""}`}>
      <div className="leaflet-map" ref={container} />
      {!ready && (
        <div className="map-loading">{error || "Charting the world…"}</div>
      )}
      {!props.decorative && (
        <>
          <div className="map-controls">
            <IconButton
              aria-label="Zoom in"
              onClick={() => map.current?.zoomIn()}
            >
              <Plus />
            </IconButton>
            <IconButton
              aria-label="Zoom out"
              onClick={() => map.current?.zoomOut()}
            >
              <Minus />
            </IconButton>
            <span />
            <IconButton
              aria-label="Focus selected nation"
              onClick={() => {
                const n = props.nations[props.selected];
                if (n)
                  map.current?.setView(
                    n.center,
                    map.current.getSize().x < 700 ? 2.6 : 4,
                    { animate: !props.motion },
                  );
              }}
            >
              <Crosshair />
            </IconButton>
            <IconButton
              aria-label="View entire world"
              onClick={() =>
                map.current?.fitBounds([
                  [-57, -160],
                  [79, 180],
                ])
              }
            >
              <GlobeHemisphereWest />
            </IconButton>
          </div>
          <div className="map-credit">
            Natural Earth · Leaflet <span>GENERALIZED BORDERS</span>
          </div>
          <span className="ocean-label atlantic">
            ATLANTIC
            <br />
            OCEAN
          </span>
          <span className="ocean-label pacific">
            PACIFIC
            <br />
            OCEAN
          </span>
        </>
      )}
    </div>
  );
}
