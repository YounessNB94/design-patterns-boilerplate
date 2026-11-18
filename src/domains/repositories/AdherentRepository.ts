
import type { Adherent, AdherentId } from "../entities";

/**
 * Port de persistance des adhérents.
 *
 * Les emails reçus doivent être normalisés :
 * trim() puis toLowerCase().
 *
 * L'implémentation doit garantir l'unicité des emails,
 * y compris en cas d'inscriptions simultanées.
 */
export interface AdherentRepository {
  /**
   * Recherche un adhérent par son identifiant.
   * Retourne null si aucun adhérent ne correspond.
   */
  findById(id: AdherentId): Promise<Adherent | null>;

  /**
   * Recherche un adhérent par email normalisé.
   * Retourne null si l'email n'est pas enregistré.
   */
  findByEmail(email: string): Promise<Adherent | null>;

  /**
   * Crée un adhérent uniquement si son email est libre.
   *
   * L'opération doit être atomique : deux inscriptions
   * simultanées avec le même email ne peuvent pas réussir.
   *
   * En cas de refus, aucune donnée n'est modifiée.
   */
  createIfEmailAvailable(
    adherent: Adherent
  ): Promise<
    | { success: true }
    | { success: false; reason: "EMAIL_ALREADY_EXISTS" }
  >;
}
