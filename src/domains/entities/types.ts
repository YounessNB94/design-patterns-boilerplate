
/** Identifiants opaques par convention, générés par les use cases via un port. */
export type AdherentId = string;
export type LivreId = string;
export type ExemplaireId = string;
export type EmpruntId = string;

/**
 * Date civile au format YYYY-MM-DD (ex. 2026-11-18).
 * Les contrats des use cases devront valider ce format à l'exécution.
 * Les calculs de délai utilisent des jours calendaires, pas des heures.
 */
export type DateCivile = string;
