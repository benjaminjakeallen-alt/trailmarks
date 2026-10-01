import { notFound } from "next/navigation";
import SceneGallery from "./SceneGallery";

/** Development only: every state activity side by side, for tuning the animations. */
export default function ScenesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SceneGallery />;
}
