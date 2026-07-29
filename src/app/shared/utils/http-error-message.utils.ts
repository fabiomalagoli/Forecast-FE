export type EntityName = 'cliente' | 'progetto' | 'risorsa' | 'ruolo' | 'gruppo' | 'favourite' | 'utente';

export type EntityAction =
  | 'caricamento'
  | 'creazione'
  | 'aggiornamento'
  | 'eliminazione'
  | 'assegnazione'
  | 'rimozione'
  | 'salvataggio'
  | 'autenticazione'
  | 'registrazione'
  | 'gruppo';

type ErrorWithStatus = Error & { status?: number };

export function buildEntityError(error: any, entity: EntityName, action: EntityAction): ErrorWithStatus {
  const specificError = new Error(getEntityErrorMessage(error, entity, action)) as ErrorWithStatus;
  specificError.status = error?.status;
  return specificError;
}

export function getHttpErrorStatusMessage(error: any): string {
  return typeof error?.status === 'number'
    ? `Errore HTTP ${error.status}`
    : 'Errore HTTP non disponibile';
}

export function getEntityErrorMessage(error: any, entity: EntityName, action: EntityAction): string {
  const entityLabel = getEntityLabel(entity);

  if (error?.status === 0) {
    return 'Impossibile raggiungere il server. Verifica la connessione o che le API siano attive.';
  }

  if (error?.status === 400) {
    return `Dati non validi per ${entityLabel}. Controlla i campi inseriti.`;
  }

  if (error?.status === 401 || error?.status === 403) {
    return `Non hai i permessi necessari per completare questa operazione su ${entityLabel}.`;
  }

  if (error?.status === 404) {
    return `${capitalize(entityLabel)} non trovato. Potrebbe essere stato rimosso o modificato.`;
  }

  if (error?.status === 409) {
    return `Operazione non completata: esiste gia un conflitto su ${entityLabel}.`;
  }

  if (error?.status === 422) {
    return `I dati di ${entityLabel} non superano le validazioni richieste.`;
  }

  if (error?.status >= 500) {
    return `Errore del server durante ${getActionLabel(action)} di ${entityLabel}. Riprova piu tardi.`;
  }

  return `Errore durante ${getActionLabel(action)} di ${entityLabel}. Riprova piu tardi.`;
}

function getEntityLabel(entity: EntityName): string {
  const labels: Record<EntityName, string> = {
    cliente: 'il cliente',
    progetto: 'il progetto',
    risorsa: 'la risorsa',
    ruolo: 'il ruolo',
    gruppo: 'il gruppo',
    favourite: 'il favourite',
    utente: 'l\'utente'
  };

  return labels[entity];
}

function getActionLabel(action: EntityAction): string {
  const labels: Record<EntityAction, string> = {
    caricamento: 'il caricamento',
    creazione: 'la creazione',
    aggiornamento: "l'aggiornamento",
    eliminazione: "l'eliminazione",
    assegnazione: "l'assegnazione",
    rimozione: 'la rimozione',
    salvataggio: 'il salvataggio',
    gruppo: 'il gruppo',
    registrazione: 'la registrazione',
    autenticazione: 'l\'autenticazione'
  };

  return labels[action];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
