"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, Popup, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
/** Copied into public/ by scripts/copy-maplibre-worker.mjs; the bundled default URL 404s. */
const WORKER_URL = "/vendor/maplibre/maplibre-gl-worker.mjs";
const ROUTE_SOURCE = "trip-route";
const HEAD_SOURCE = "trip-head";

export interface TripMapPoint {
  lat: number;
  lng: number;
}

export interface TripMapPin {
  id: number | string;
  lat: number;
  lng: number;
  label: string;
  index: number;
}

interface TripMapProps {
  points: TripMapPoint[];
  pins?: TripMapPin[];
  onPinClick?: (id: number | string) => void;
  followLatest?: boolean;
  className?: string;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function routeData(points: TripMapPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features:
      points.length < 2
        ? []
        : [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
            },
          ],
  };
}

function headData(points: TripMapPoint[]): GeoJSON.FeatureCollection {
  const last = points[points.length - 1];
  return {
    type: "FeatureCollection",
    features: last
      ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [last.lng, last.lat] } }]
      : [],
  };
}

export default function TripMap({ points, pins = [], onPinClick, followLatest, className }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const readyRef = useRef(false);
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl(WORKER_URL);
    const dark = document.documentElement.dataset.theme === "dark";
    const first = pointsRef.current[0];
    const map = new MapLibreMap({
      container: containerRef.current,
      style: dark ? STYLE_DARK : STYLE_LIGHT,
      center: first ? [first.lng, first.lat] : [-96, 38.5],
      zoom: first ? 10 : 3.3,
      attributionControl: { compact: true },
      fadeDuration: 250,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // If the dark style is ever unavailable, fall back to the light one rather than a blank map.
    let fellBack = !dark;
    map.on("error", () => {
      if (!fellBack && !map.isStyleLoaded()) {
        fellBack = true;
        map.setStyle(STYLE_LIGHT);
      }
    });

    map.on("style.load", () => {
      const aqua = cssVar("--success", "#15a898");
      const petrol = cssVar("--accent", "#0b5c63");
      const halo = cssVar("--surface", "#ffffff");

      map.addSource(ROUTE_SOURCE, { type: "geojson", data: routeData(pointsRef.current), lineMetrics: true });
      map.addSource(HEAD_SOURCE, { type: "geojson", data: headData(pointsRef.current) });

      map.addLayer({
        id: "trip-route-casing",
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": halo, "line-width": 9, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-width": 4.5,
          "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, aqua, 1, petrol],
        },
      });
      map.addLayer({
        id: "trip-head-glow",
        type: "circle",
        source: HEAD_SOURCE,
        paint: { "circle-radius": 16, "circle-color": petrol, "circle-opacity": 0.18 },
      });
      map.addLayer({
        id: "trip-head",
        type: "circle",
        source: HEAD_SOURCE,
        paint: { "circle-radius": 6.5, "circle-color": petrol, "circle-stroke-width": 3, "circle-stroke-color": halo },
      });

      readyRef.current = true;
      fit(map, pointsRef.current, false);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined)?.setData(routeData(points));
    (map.getSource(HEAD_SOURCE) as GeoJSONSource | undefined)?.setData(headData(points));
    fit(map, points, !!followLatest);
  }, [points, followLatest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = pins.map((pin) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `Step ${pin.index + 1}: ${pin.label}`);
      el.textContent = String(pin.index + 1).padStart(2, "0");
      el.className =
        "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(0_0_0/0.45)] ring-[3px] ring-white transition-transform duration-300 hover:scale-110";
      el.addEventListener("click", () => onPinClick?.(pin.id));
      return new Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(new Popup({ offset: 18, closeButton: false }).setText(pin.label))
        .addTo(map);
    });
  }, [pins, onPinClick]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

function fit(map: MapLibreMap, points: TripMapPoint[], follow: boolean) {
  if (points.length === 0) return;
  const last = points[points.length - 1];
  if (points.length === 1) {
    map.easeTo({ center: [last.lng, last.lat], zoom: 12, duration: 600 });
    return;
  }
  if (follow) {
    map.easeTo({ center: [last.lng, last.lat], duration: 500 });
    return;
  }
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: { top: 70, bottom: 110, left: 50, right: 50 }, maxZoom: 13, duration: 800 },
  );
}
