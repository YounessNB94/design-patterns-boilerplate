
import type { Adherent } from "../entities";
import type { AdherentRepository } from "../repositories";
import type { IdGenerator } from "../ports";

/**
 * USE CASE : Inscrire un adhérent
 *
 * Objectif :
 * Créer un adhérent avec un identifiant unique,
 * uniquement si ses données sont valides et si
 * son adresse email n'est pas déjà enregistrée.
 *
 * Règles métier :
 * - Le nom, le prénom et l'email sont obligatoires.
 * - Le nom et le prénom sont nettoyés avec trim().
 * - L'email est nettoyé avec trim() et toLowerCase().
 * - L'email doit respecter le format défini ci-dessous.
 * - Deux adhérents ne peuvent pas avoir le même email.
 * - L'identifiant est fourni par IdGenerator.
 * - Aucun adhérent n'est créé en cas de refus.
 *
 * Ordre des validations :
 * 1. Nom
 * 2. Prénom
 * 3. Email
 * 4. Unicité de l'email
 */

export interface RegisterAdherentInput {
  nom: string;
  prenom: string;
  email: string;
}

/**
 * Dépendances nécessaires au use case.
 *
 * Le use case ne dépend d'aucune base de données
 * ni d'aucune implémentation technique concrète.
 */
export interface RegisterAdherentDependencies {
  adherentRepository: AdherentRepository;
  idGenerator: IdGenerator;
}

/**
 * Résultats possibles.
 *
 * Une seule des deux formes peut être retournée :
 * - success: true avec l'adhérent créé ;
 * - success: false avec une erreur métier précise.
 */
export type RegisterAdherentResult =
  | {
      success: true;
      adherent: Adherent;
    }
  | {
      success: false;
      error:
        | "INVALID_NAME"
        | "INVALID_FIRST_NAME"
        | "INVALID_EMAIL"
        | "EMAIL_ALREADY_EXISTS";
    };

/**
 * Format email accepté pour ce TP :
 * - une partie non vide avant @ ;
 * - une seule arobase ;
 * - un domaine avec au moins un point ;
 * - aucune espace ;
 * - aucune partie vide autour du point final.
 *
 * Ce contrôle ne vérifie pas que la boîte existe.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Inscrit un nouvel adhérent.
 *
 * Préconditions techniques :
 * - Le repository respecte l'unicité atomique
 *   des emails normalisés.
 * - IdGenerator produit des identifiants uniques.
 *
 * Les erreurs d'infrastructure (base indisponible,
 * erreur de génération, etc.) ne sont pas des refus
 * métier : elles sont propagées à l'appelant.
 */
export async function registerAdherent(
  input: RegisterAdherentInput,
  dependencies: RegisterAdherentDependencies
): Promise<RegisterAdherentResult> {
  const { adherentRepository, idGenerator } = dependencies;

  // 1. Normaliser les données.
  const nom = input.nom.trim();
  const prenom = input.prenom.trim();
  const email = input.email.trim().toLowerCase();

  // 2. Vérifier le nom.
  if (nom.length === 0) {
    return {
      success: false,
      error: "INVALID_NAME",
    };
  }

  // 3. Vérifier le prénom.
  if (prenom.length === 0) {
    return {
      success: false,
      error: "INVALID_FIRST_NAME",
    };
  }

  // 4. Vérifier le format de l'email.
  if (!EMAIL_REGEX.test(email)) {
    return {
      success: false,
      error: "INVALID_EMAIL",
    };
  }

  // 5. Vérifier si l'email est déjà enregistré.
  const existingAdherent =
    await adherentRepository.findByEmail(email);

  if (existingAdherent !== null) {
    return {
      success: false,
      error: "EMAIL_ALREADY_EXISTS",
    };
  }

  // 6. Générer un identifiant unique.
  const id = idGenerator.generateAdherentId();

  // 7. Construire l'entité métier.
  const adherent: Adherent = {
    id,
    nom,
    prenom,
    email,
  };

  // 8. Enregistrer avec garantie d'unicité atomique.
  const creationResult =
    await adherentRepository.createIfEmailAvailable(
      adherent
    );

  // L'email a pu être utilisé entre la recherche
  // et l'enregistrement par une autre inscription.
  if (!creationResult.success) {
    return {
      success: false,
      error: "EMAIL_ALREADY_EXISTS",
    };
  }

  // 9. Retourner l'adhérent créé.
  return {
    success: true,
    adherent,
  };
}
