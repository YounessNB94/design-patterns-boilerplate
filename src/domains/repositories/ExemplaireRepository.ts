
import type {
  Exemplaire,
  ExemplaireId,
} from "../entities";

/**
 * Port de consultation des exemplaires physiques.
 *
 * Chaque exemplaire possède un identifiant unique
 * et fait référence à un livre existant.
 *
 * Sa disponibilité dépend des emprunts actifs.
 */
export interface ExemplaireRepository {
  /**
   * Recherche un exemplaire par son identifiant.
   *
   * Retourne null si l'exemplaire n'existe pas.
   */
  findById(
    id: ExemplaireId
  ): Promise<Exemplaire | null>;
}
