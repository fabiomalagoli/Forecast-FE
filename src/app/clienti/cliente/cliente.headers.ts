import { ModelloCliente } from "./cliente.model";

//Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo ModelloCliente.
export const CLIENTE_HEADERS: Record<keyof ModelloCliente, string> = {
   id: 'ID',
   name: 'Nome',
   fullAddress: 'Indirizzo',
   projects: 'Progetti Attivi',
};