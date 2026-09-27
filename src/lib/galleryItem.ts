import type { Photo } from "@/lib/types";

export interface GalleryItem {
  photo: Photo;
  memoryId: number;
  memoryTitle: string;
  stateCode: string | null;
  memoryDate: string | null;
}
