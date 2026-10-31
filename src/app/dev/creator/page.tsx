import { notFound } from "next/navigation";
import CreatorLab from "./CreatorLab";

/** Development only: the character maker with a pretend signed-in person. */
export default function CreatorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CreatorLab />;
}
