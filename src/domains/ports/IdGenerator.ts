
import type {
  AdherentId,
  EmpruntId,
} from "../entities";

/**
 * Port de génération des identifiants.
 *
 * Chaque identifiant généré doit être unique
 * dans son ensemble d'entités.
 *
 * L'implémentation technique choisit le mécanisme
 * de génération : UUID, séquence, etc.
 */
export interface IdGenerator {
  generateAdherentId(): AdherentId;

  generateEmpruntId(): EmpruntId;
}
