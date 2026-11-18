
import type {
  DateCivile,
  EmpruntTermine,
  ExemplaireId,
} from "../entities";

import type { EmpruntRepository } from "../repositories";
import type { Clock } from "../ports";

/**
 * USE CASE : Retourner un exemplaire
 *
 * Règles métier :
 * - L'exemplaire doit avoir un emprunt actif.
 * - La date du retour est la date du jour.
 * - Un retour est accepté même après l'échéance.
 * - Aucun paiement ni pénalité n'est appliqué.
 * - Le retard est exprimé en jours calendaires.
 * - Un retour à la date prévue donne 0 jour de retard.
 * - Un retour anticipé donne 0 jour de retard.
 * - L'emprunt terminé reste dans l'historique.
 * - L'exemplaire redevient disponible.
 *
 * En cas d'absence d'emprunt actif :
 * - retourner ACTIVE_LOAN_NOT_FOUND ;
 * - ne modifier aucune donnée.
 *
 * La finalisation doit être atomique pour empêcher
 * deux retours simultanés du même emprunt.
 */

/** Identifiant de l'exemplaire rapporté. */
export interface ReturnBookInput {
  exemplaireId: ExemplaireId;
}

/** Dépendances nécessaires au use case. */
export interface ReturnBookDependencies {
  empruntRepository: EmpruntRepository;
  clock: Clock;
}

/**
 * Résultats possibles :
 * - Succès : emprunt terminé et retard enregistré.
 * - Refus : aucun emprunt actif correspondant.
 *
 * Les erreurs techniques sont propagées à l'appelant.
 */
export type ReturnBookResult =
  | {
      success: true;
      emprunt: EmpruntTermine;
    }
  | {
      success: false;
      error: "ACTIVE_LOAN_NOT_FOUND";
    };

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convertit une date civile YYYY-MM-DD en timestamp UTC.
 *
 * UTC est utilisé uniquement pour effectuer les calculs
 * calendaires sans décalage lié aux heures été/hiver.
 *
 * Les dates invalides provoquent une erreur technique.
 */
function dateToTimestamp(date: DateCivile): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("INVALID_DATE");
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("INVALID_DATE");
  }

  return parsedDate.getTime();
}

/**
 * Calcule les jours de retard.
 *
 * Si dateRetour <= dateRetourPrevue :
 *   retard = 0
 *
 * Sinon :
 *   retard = nombre de jours calendaires de différence.
 *
 * Exemples :
 * 02/12 -> 02/12 : 0 jour
 * 02/12 -> 03/12 : 1 jour
 * 02/12 -> 07/12 : 5 jours
 */
function calculateLateDays(
  dateRetourPrevue: DateCivile,
  dateRetour: DateCivile
): number {
  const expectedTimestamp =
    dateToTimestamp(dateRetourPrevue);

  const actualTimestamp =
    dateToTimestamp(dateRetour);

  const differenceInDays =
    (actualTimestamp - expectedTimestamp) /
    MILLISECONDS_PER_DAY;

  return Math.max(0, differenceInDays);
}

/**
 * Termine l'emprunt actif d'un exemplaire.
 *
 * Préconditions :
 * - Clock fournit une date civile locale valide.
 * - Les dates de l'emprunt sont cohérentes.
 * - Le repository respecte la finalisation atomique.
 *
 * Aucun emprunt actif ne peut être terminé deux fois.
 * Le repository conserve l'emprunt dans l'historique.
 */
export async function returnBook(
  input: ReturnBookInput,
  dependencies: ReturnBookDependencies
): Promise<ReturnBookResult> {
  const { empruntRepository, clock } = dependencies;

  // 1. Vérifier l'identifiant de l'exemplaire.
  if (input.exemplaireId.trim().length === 0) {
    return {
      success: false,
      error: "ACTIVE_LOAN_NOT_FOUND",
    };
  }

  // 2. Rechercher l'emprunt actif de l'exemplaire.
  const activeLoan =
    await empruntRepository.findActiveByExemplaireId(
      input.exemplaireId
    );

  if (activeLoan === null) {
    return {
      success: false,
      error: "ACTIVE_LOAN_NOT_FOUND",
    };
  }

  // 3. Récupérer la date réelle du retour.
  const dateRetour = clock.today();

  // 4. Vérifier la cohérence chronologique.
  const retourTimestamp = dateToTimestamp(dateRetour);
  const empruntTimestamp = dateToTimestamp(
    activeLoan.dateEmprunt
  );

  if (retourTimestamp < empruntTimestamp) {
    throw new Error("RETURN_BEFORE_BORROW_DATE");
  }

  // 5. Calculer le nombre de jours de retard.
  const retardJours = calculateLateDays(
    activeLoan.dateRetourPrevue,
    dateRetour
  );

  // 6. Terminer l'emprunt de manière atomique.
  const result = await empruntRepository.finishActiveLoan(
    activeLoan.id,
    dateRetour,
    retardJours
  );

  // Un autre retour a pu être enregistré entre
  // la recherche initiale et la finalisation.
  if (!result.success) {
    return {
      success: false,
      error: "ACTIVE_LOAN_NOT_FOUND",
    };
  }

  // 7. Retourner l'emprunt terminé.
  return {
    success: true,
    emprunt: result.emprunt,
  };
}
