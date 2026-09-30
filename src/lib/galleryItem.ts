import type { Photo } from "@/lib/types";

export interface GalleryItem {
  photo: Photo;
  memoryId: number;
  memoryTitle: string;
  /** Who posted it; shown in the slideshow when the family has more than one member. */
  userId: string | null;
  stateCode: string | null;
  memoryDate: string | null;
}
