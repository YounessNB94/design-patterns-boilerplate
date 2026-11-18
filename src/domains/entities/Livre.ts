
import type { LivreId } from "./types";

/** Ouvrage bibliographique, distinct de ses exemplaires physiques. */
export interface Livre {
  readonly id: LivreId;
  readonly titre: string;
}
