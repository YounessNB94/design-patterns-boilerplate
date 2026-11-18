
import type { ExemplaireId, LivreId } from "./types";

/** Copie physique d'un livre : chaque exemplaire a son identifiant propre. */
export interface Exemplaire {
  readonly id: ExemplaireId;
  readonly livreId: LivreId;
}
