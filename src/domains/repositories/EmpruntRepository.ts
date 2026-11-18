
import type {
  AdherentId,
  DateCivile,
  Emprunt,
  EmpruntActif,
  EmpruntTermine,
  ExemplaireId,
} from "../entities";

/**
 * Port de persistance des emprunts.
 *
 * Règles :
 * - Un exemplaire ne peut avoir qu'un emprunt actif.
 * - Un adhérent peut avoir au maximum 3 emprunts actifs.
 * - Un emprunt terminé reste dans l'historique.
 * - Une opération refusée ne modifie aucune donnée.
 */
export interface EmpruntRepository {
  /**
   * Compte les emprunts actifs d'un adhérent.
   *
   * Les emprunts terminés ne sont pas comptabilisés.
   */
  countActiveByAdherentId(
    adherentId: AdherentId
  ): Promise<number>;

  /**
   * Recherche l'emprunt actif d'un exemplaire.
   *
   * Retourne null si l'exemplaire n'est pas emprunté.
   */
  findActiveByExemplaireId(
    exemplaireId: ExemplaireId
  ): Promise<EmpruntActif | null>;

  /**
   * Enregistre un nouvel emprunt actif.
   *
   * L'opération vérifie atomiquement :
   * - que l'adhérent a moins de maxActive emprunts ;
   * - que l'exemplaire n'a aucun emprunt actif.
   *
   * maxActive doit être un entier strictement positif.
   * Le use case lui transmettra la valeur métier 3.
   *
   * Si une condition échoue, rien n'est enregistré.
   *
   * En cas de plusieurs refus possibles, la limite
   * d'emprunts est prioritaire sur la disponibilité.
   *
   * Préconditions :
   * - adhérent et exemplaire existants ;
   * - identifiant d'emprunt nouveau et unique ;
   * - dates métier déjà calculées et validées.
   */
  createActiveIfAllowed(
    emprunt: EmpruntActif,
    maxActive: number
  ): Promise<
    | { success: true }
    | {
        success: false;
        reason:
          | "BORROW_LIMIT_REACHED"
          | "EXEMPLAIRE_UNAVAILABLE";
      }
  >;

  /**
   * Termine l'emprunt actif d'un exemplaire.
   *
   * dateRetour : date civile réelle du retour.
   * retardJours : entier positif ou nul, calculé
   * par le use case.
   *
   * L'opération doit être atomique :
   * un même emprunt ne peut être terminé deux fois.
   *
   * Le retour est accepté même en cas de retard.
   * Aucun emprunt actif : aucune modification.
   *
   * Précondition : le use case a préalablement
   * vérifié la cohérence des dates et du retard.
   */
  finishActiveLoan(
    exemplaireId: ExemplaireId,
    dateRetour: DateCivile,
    retardJours: number
  ): Promise<
    | { success: true; emprunt: EmpruntTermine }
    | { success: false; reason: "ACTIVE_LOAN_NOT_FOUND" }
  >;

  /**
   * Recherche un emprunt, actif ou terminé,
   * dans l'historique de la bibliothèque.
   */
  findById(id: Emprunt["id"]): Promise<Emprunt | null>;
}
