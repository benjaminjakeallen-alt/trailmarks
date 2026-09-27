export interface Photo {
  id: number;
  stateCode: string;
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
  stateCode: string;
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
