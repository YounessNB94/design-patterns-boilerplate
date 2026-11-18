
import type {
  AdherentId,
  DateCivile,
  EmpruntId,
  ExemplaireId,
} from "./types";

/**
 * L'emprunt est actif si dateRetour === null.
 * Un retour terminé a une dateRetour renseignée et un retardJours >= 0.
 * Un emprunt actif a retardJours === null : le retard n'est figé qu'au retour.
 * Le même exemplaire ne peut avoir qu'un seul emprunt actif à la fois.
 */
export type Emprunt = EmpruntActif | EmpruntTermine;

interface EmpruntCommun {
  readonly id: EmpruntId;
  readonly adherentId: AdherentId;
  readonly exemplaireId: ExemplaireId;
  readonly dateEmprunt: DateCivile;
  /** dateEmprunt + 14 jours calendaires */
  readonly dateRetourPrevue: DateCivile;
}

export interface EmpruntActif extends EmpruntCommun {
  readonly dateRetour: null;
  readonly retardJours: null;
}

export interface EmpruntTermine extends EmpruntCommun {
  readonly dateRetour: DateCivile;
  /** Entier positif ou nul, calculé au moment du retour. */
  readonly retardJours: number;
}
