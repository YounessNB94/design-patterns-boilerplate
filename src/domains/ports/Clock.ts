
import type { DateCivile } from "../entities";

/**
 * Port permettant d'obtenir la date du jour.
 *
 * La date doit être au format YYYY-MM-DD.
 * Elle correspond à la date civile locale
 * de la bibliothèque.
 *
 * En test, une implémentation peut retourner
 * une date fixe pour obtenir un résultat prévisible.
 */
export interface Clock {
  today(): DateCivile;
}
