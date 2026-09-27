export interface Photo {
  id: number;
  stateCode: string | null;
  memoryId: number | null;
  fileName: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
}

export interface Memory {
  id: number;
  stateCode: string | null;
  tripId: number | null;
  lat: number | null;
  lng: number | null;
  title: string;
  body: string | null;
  memoryDate: string | null;
  createdAt: string;
  photos: Photo[];
}

export interface StateVisit {
  stateCode: string;
  visited: boolean;
  firstVisitedOn: string | null;
}

export type TripStatus = "planned" | "active" | "completed";

export interface TripPoint {
  id: number;
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface Trip {
  id: number;
  title: string;
  description: string | null;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  coverPhotoId: number | null;
  coverPhotoUrl: string | null;
  createdAt: string;
}

export interface TripDetail extends Trip {
  points: TripPoint[];
  memories: Memory[];
  stateCodes: string[];
  distanceMiles: number;
}
