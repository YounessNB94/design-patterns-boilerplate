import type { AdherentId, DateCivile, EmpruntActif, ExemplaireId} from "../entities";    
import type {AdherentRepository, ExemplaireRepository, EmpruntRepository} from "../repositories";

import type { Clock, IdGenerator } from "../ports";
/**
 * USE CASE : Emprunter un exemplaire
 *
 * Règles métier :
 * - L'adhérent doit exister.
 * - L'exemplaire doit exister.
 * - Un adhérent peut avoir au maximum 3 emprunts actifs.
 * - Un exemplaire ne peut avoir qu'un emprunt actif.
 * - La durée de l'emprunt est de 14 jours calendaires.
 * - Un refus ne crée aucun nouvel emprunt.
 *
 * Ordre de priorité des refus :
 * 1. ADHERENT_NOT_FOUND
 * 2. EXEMPLAIRE_NOT_FOUND
 * 3. BORROW_LIMIT_REACHED
 * 4. EXEMPLAIRE_UNAVAILABLE
 *
 * Une création atomique par le repository est obligatoire
 * pour gérer correctement les emprunts simultanés.
 */

const MAX_ACTIVE_LOANS = 3;
const LOAN_DURATION_DAYS = 14;

/** Identifiants de l'adhérent et de l'exemplaire demandé. */
export interface BorrowBookInput {
  adherentId: AdherentId;
  exemplaireId: ExemplaireId;
}

/** Dépendances injectées via les ports du domaine. */
export interface BorrowBookDependencies {
  adherentRepository: AdherentRepository;
  exemplaireRepository: ExemplaireRepository;
  empruntRepository: EmpruntRepository;
  clock: Clock;
  idGenerator: IdGenerator;
}

/**
 * Résultats possibles :
 * - Succès : emprunt actif créé.
 * - Refus : code métier explicite.
 *
 * Les erreurs techniques des dépendances sont propagées.
 */
export type BorrowBookResult =
  | {
      success: true;
      emprunt: EmpruntActif;
    }
  | {
      success: false;
      error:
        | "ADHERENT_NOT_FOUND"
        | "EXEMPLAIRE_NOT_FOUND"
        | "BORROW_LIMIT_REACHED"
        | "EXEMPLAIRE_UNAVAILABLE";
    };

/**
 * Ajoute des jours calendaires à une date YYYY-MM-DD.
 *
 * Le calcul utilise UTC pour éviter les décalages
 * liés aux changements d'heure été/hiver.
 *
 * Le Clock doit retourner une date civile valide.
 * Une date invalide provoque une erreur technique.
 */
function addCalendarDays(
  date: DateCivile,
  days: number
): DateCivile {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("INVALID_CLOCK_DATE");
  }

  parsedDate.setUTCDate(
    parsedDate.getUTCDate() + days
  );

  return parsedDate.toISOString().slice(0, 10);
}

/**
 * Enregistre un emprunt pour un adhérent.
 *
 * Préconditions :
 * - Les identifiants sont des chaînes.
 * - Une chaîne vide ou composée d'espaces ne
 *   correspond à aucun adhérent ou exemplaire.
 * - Clock retourne une date civile locale valide.
 * - IdGenerator fournit des identifiants uniques.
 * - Les repositories respectent leurs contrats.
 *
 * Aucune modification métier n'est réalisée
 * avant l'appel atomique createActiveIfAllowed().
 */
export async function borrowBook(
  input: BorrowBookInput,
  dependencies: BorrowBookDependencies
): Promise<BorrowBookResult> {
  const {
    adherentRepository,
    exemplaireRepository,
    empruntRepository,
    clock,
    idGenerator,
  } = dependencies;

  // 1. Vérifier l'identifiant de l'adhérent.
  if (input.adherentId.trim().length === 0) {
    return {
      success: false,
      error: "ADHERENT_NOT_FOUND",
    };
  }

  // 2. Rechercher l'adhérent.
  const adherent = await adherentRepository.findById(
    input.adherentId
  );

  if (adherent === null) {
    return {
      success: false,
      error: "ADHERENT_NOT_FOUND",
    };
  }

  // 3. Vérifier l'identifiant de l'exemplaire.
  if (input.exemplaireId.trim().length === 0) {
    return {
      success: false,
      error: "EXEMPLAIRE_NOT_FOUND",
    };
  }

  // 4. Vérifier l'existence de l'exemplaire.
  const exemplaire = await exemplaireRepository.findById(
    input.exemplaireId
  );

  if (exemplaire === null) {
    return {
      success: false,
      error: "EXEMPLAIRE_NOT_FOUND",
    };
  }

  // 5. Compter les emprunts actifs de l'adhérent.
  const activeLoans =
    await empruntRepository.countActiveByAdherentId(
      adherent.id
    );

  if (activeLoans >= MAX_ACTIVE_LOANS) {
    return {
      success: false,
      error: "BORROW_LIMIT_REACHED",
    };
  }

  // 6. Vérifier la disponibilité de l'exemplaire.
  const activeLoan =
    await empruntRepository.findActiveByExemplaireId(
      exemplaire.id
    );

  if (activeLoan !== null) {
    return {
      success: false,
      error: "EXEMPLAIRE_UNAVAILABLE",
    };
  }

  // 7. Calculer les dates de l'emprunt.
  const dateEmprunt = clock.today();
  const dateRetourPrevue = addCalendarDays(
    dateEmprunt,
    LOAN_DURATION_DAYS
  );

  // 8. Construire le nouvel emprunt actif.
  const emprunt: EmpruntActif = {
    id: idGenerator.generateEmpruntId(),
    adherentId: adherent.id,
    exemplaireId: exemplaire.id,
    dateEmprunt,
    dateRetourPrevue,
    dateRetour: null,
    retardJours: null,
  };

  // 9. Enregistrement atomique.
  // Le repository revérifie la limite et la
  // disponibilité au moment de la création.
  const creationResult =
    await empruntRepository.createActiveIfAllowed(
      emprunt,
      MAX_ACTIVE_LOANS
    );

  if (!creationResult.success) {
    return {
      success: false,
      error: creationResult.reason,
    };
  }

  // 10. Retourner l'emprunt créé.
  return {
    success: true,
    emprunt,
  };
}