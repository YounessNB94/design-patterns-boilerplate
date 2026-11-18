
import type { Livre, LivreId } from "../entities";

/**
 * Port de consultation du catalogue des livres.
 *
 * Un livre représente un ouvrage.
 * Il peut être associé à plusieurs exemplaires.
 */
export interface LivreRepository {
  /**
   * Recherche un livre à partir de son identifiant.
   *
   * Retourne null si le livre n'existe pas.
   */
  findById(id: LivreId): Promise<Livre | null>;
}
