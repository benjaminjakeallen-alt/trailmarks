import { notFound } from "next/navigation";
import CharacterLab from "./CharacterLab";

/** Development only: the character preview with a few looks, for tuning. */
export default function CharacterPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CharacterLab />;
}
