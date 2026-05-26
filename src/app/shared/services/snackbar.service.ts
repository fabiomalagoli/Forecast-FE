import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';
import { NotifyAction } from '../enums/notify.enum';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
    private snackBar = inject(MatSnackBar);
    error(type: NotifyAction, params: string | string[], action = 'Chiudi'): MatSnackBarRef<SimpleSnackBar> {
        let message: string;
        const paramsArray = Array.isArray(params) ? params : [params];
        if(!type){
            message = paramsArray[0]
        }
        else {
            switch (type) {
                case NotifyAction.Caricamento:
                    message = `Errore durante il caricamento di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Ricaricamento:
                    message = `Errore durante il ricaricamento di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Creazione:
                    message = `Errore durante la creazione di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Aggiornamento:
                    message = `Errore durante l'aggiornamento di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Eliminazione:
                    message = `Errore durante l'eliminazione di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Assegnazione:
                    message = `Errore durante l'assegnazione di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Rimozione:
                    message = `Errore durante la rimozione di ${paramsArray[0]}`;
                    break;
                case NotifyAction.Salvataggio:
                    message = `Errore durante il salvataggio di ${paramsArray[0]}`;
                    break;
                case NotifyAction.AddEmployee:
                    message = `Errore durante l'aggiunta di un dipendente`;
                    break;
                case NotifyAction.AddProject:
                    message = `Errore durante l'aggiunta di un progetto`;
                    break;
                case NotifyAction.AddRole:
                    message = `Errore durante l'aggiunta di un ruolo`;
                    break;
                case NotifyAction.AddClient:
                    message = `Errore durante l'aggiunta di un cliente`;
                    break;
                case NotifyAction.UpdateEmployee:
                    message = `Errore durante l'aggiornamento di un dipendente`;
                    break;
                case NotifyAction.UpdateProject:
                    message = `Errore durante l'aggiornamento di un progetto`;
                    break;
                case NotifyAction.UpdateRole:
                    message = `Errore durante l'aggiornamento di un ruolo`;
                    break;
                case NotifyAction.UpdateClient:
                    message = `Errore durante l'aggiornamento di un cliente`;
                    break;
                case NotifyAction.FiltriEmployee:
                    message = `Errore durante l'applicazione dei filtri sui dipendenti`;
                    break;
                case NotifyAction.FiltriProject:
                    message = `Errore durante l'applicazione dei filtri sui progetti`;
                    break;
                case NotifyAction.FiltriRole:
                    message = `Errore durante l'applicazione dei filtri sui ruoli`;
                    break;
                case NotifyAction.FiltriClient:
                    message = `Errore durante l'applicazione dei filtri sui clienti`;
                    break;
                case NotifyAction.CampiObbligatori:
                    message = `Errore: campi obbligatori mancanti o non validi`;
                    break;
                default:
                    message = `Errore non specificato`;
            }
        }
        return this.snackBar.open(message, action, {
            panelClass: ['snackbar-error'],
            duration: action === 'Riprova' ? 10000 : 5000,
        });
    }
    success(type: NotifyAction, params?: string | string[]): MatSnackBarRef<SimpleSnackBar> {
        let message: string;
        const paramsArray = params ? (Array.isArray(params) ? params : [params]) : [];
        switch (type) {
            case NotifyAction.Caricamento:
                message = `Caricamento di ${paramsArray[0]} riuscito`;
                break;
            case NotifyAction.Ricaricamento:
                message = `Ricaricamento di ${paramsArray[0]} riuscito`;
                break;
            case NotifyAction.Creazione:
                message = `Creazione di ${paramsArray[0]} riuscita`;
                break;
            case NotifyAction.Aggiornamento:
                message = `Aggiornamento di ${paramsArray[0]} riuscito`;
                break;
            case NotifyAction.Eliminazione:
                message = `Eliminazione di ${paramsArray[0]} riuscita`;
                break;
            case NotifyAction.Assegnazione:
                message = `Assegnazione di ${paramsArray[0]} riuscita`;
                break;
            case NotifyAction.Rimozione:
                message = `Rimozione di ${paramsArray[0]} riuscita`;
                break;
            case NotifyAction.Salvataggio:
                message = `Salvataggio di ${paramsArray[0]} riuscito`;
                break;
            case NotifyAction.AddEmployee:
                message = `Dipendente aggiunto con successo`;
                break;
            case NotifyAction.AddProject:
                message = `Progetto aggiunto con successo`;
                break;
            case NotifyAction.AddRole:
                message = `Ruolo aggiunto con successo`;
                break;
            case NotifyAction.AddClient:
                message = `Cliente aggiunto con successo`;
                break;
            case NotifyAction.UpdateEmployee:
                message = `Dipendente aggiornato con successo`;
                break;
            case NotifyAction.UpdateProject:
                message = `Progetto aggiornato con successo`;
                break;
            case NotifyAction.UpdateRole:
                message = `Ruolo aggiornato con successo`;
                break;
            case NotifyAction.UpdateClient:
                message = `Cliente aggiornato con successo`;
                break;
            case NotifyAction.FiltriEmployee:
                message = `Filtri sui dipendenti applicati con successo`;
                break;
            case NotifyAction.FiltriProject:
                message = `Filtri sui progetti applicati con successo`;
                break;
            case NotifyAction.FiltriRole:
                message = `Filtri sui ruoli applicati con successo`;
                break;
            case NotifyAction.FiltriClient:
                message = `Filtri sui clienti applicati con successo`;
                break;
            case NotifyAction.CampiObbligatori:
                message = `Tutti i campi obbligatori sono stati compilati correttamente`;
                break;
            default:
                message = `Operazione completata con successo`;
        }
        return this.snackBar.open(message, 'Chiudi', {
            panelClass: ['snackbar-success'],
            duration: 5000
        });
    }
}