
import type { AdherentId } from "./types";

/** Personne inscrite. L'unicité de l'email normalisé est une règle métier. */
export interface Adherent {
  readonly id: AdherentId;
  readonly nom: string;
  readonly prenom: string;
  /** Email normalisé : espaces extérieurs retirés et casse uniformisée. */
  readonly email: string;
}
