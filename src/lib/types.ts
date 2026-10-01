export interface Photo {
  id: number;
  userId: string | null;
  stateCode: string | null;
  memoryId: number | null;
  fileName: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  /** From the photo's EXIF, when it had one. */
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  url: string;
}

export interface Memory {
  id: number;
  /** Who wrote it. Memories are shared with the whole family. */
  userId: string | null;
  stateCode: string | null;
  tripId: number | null;
  lat: number | null;
  lng: number | null;
  title: string;
  body: string | null;
  memoryDate: string | null;
  createdAt: string;
  photos: Photo[];
  /** The voice recording it was dictated from, if kept. */
  audioUrl: string | null;
  audioSeconds: number | null;
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
  /** Who recorded it. Only they can record, finish or delete it; the family can view it. */
  userId: string | null;
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

/** A family member as everyone else sees them. */
export interface Member {
  userId: string;
  displayName: string;
  color: string;
  /** Their adventurer avatar (made from a selfie), if they've made one. */
  avatarUrl: string | null;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  members: Member[];
}

/** The signed-in person. */
export interface Viewer extends Member {
  email: string;
  familyId: string;
}

/** One person's claim on one state. */
export interface FamilyVisit {
  userId: string;
  stateCode: string;
  firstVisitedOn: string | null;
}

/** One person's claim on one country. */
export interface FamilyCountryVisit {
  userId: string;
  countryCode: string;
  firstVisitedOn: string | null;
}
