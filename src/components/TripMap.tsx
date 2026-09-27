"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const ROUTE_SOURCE_ID = "trip-route";
const ROUTE_LINE_LAYER_ID = "trip-route-line";
const ROUTE_HEAD_LAYER_ID = "trip-route-head";

export interface TripMapPoint {
  lat: number;
  lng: number;
}

export interface TripMapPin {
  id: number | string;
  lat: number;
  lng: number;
  label: string;
}

interface TripMapProps {
  points: TripMapPoint[];
  pins?: TripMapPin[];
  onPinClick?: (id: number | string) => void;
  followLatest?: boolean;
  className?: string;
}

function emptyRouteGeoJson(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function routeGeoJson(points: TripMapPoint[]): GeoJSON.FeatureCollection {
  if (points.length < 2) return emptyRouteGeoJson();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
      },
    ],
  };
}

export default function TripMap({ points, pins = [], onPinClick, followLatest, className }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: points[0] ? [points[0].lng, points[0].lat] : [-98.5, 39.8],
      zoom: points[0] ? 10 : 3.2,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: emptyRouteGeoJson() });
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#d9711f", "line-width": 4, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: ROUTE_HEAD_LAYER_ID,
        type: "circle",
        source: ROUTE_SOURCE_ID,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#d9711f",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the route line (and a "current position" dot) in sync with points.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;

      const geojson = routeGeoJson(points);
      const last = points[points.length - 1];
      if (last) {
        geojson.features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [last.lng, last.lat] },
        });
      }
      source.setData(geojson);

      if (points.length === 1) {
        map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 11 });
      } else if (points.length > 1) {
        const lngs = points.map((p) => p.lng);
        const lats = points.map((p) => p.lat);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];
        if (followLatest) {
          map.panTo([last.lng, last.lat], { duration: 400 });
        } else {
          map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 400 });
        }
      }
    };

    if (loadedRef.current) apply();
    else map.once("load", apply);
  }, [points, followLatest]);

  // Memory "step" pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = pins.map((pin) => {
      const el = document.createElement("button");
      el.setAttribute("aria-label", pin.label);
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = "#2f6f5e";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
      el.style.cursor = "pointer";
      el.addEventListener("click", () => onPinClick?.(pin.id));

      return new Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(new Popup({ offset: 12 }).setText(pin.label))
        .addTo(map);
    });
  }, [pins, onPinClick]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
