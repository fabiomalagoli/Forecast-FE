import { Customer } from "./customer.model";

//Record per inserire i titoli (headers) dei dati della tabella Clienti corrispondenti ai parametri del tipo ModelloCliente.
export const CUSTOMER_HEADERS = {
   id: 'ID',
   vatNumber: 'Partita IVA',
   name: 'Nome',
   address: 'Indirizzo',
   streetNumber: 'Civico',
   postalCode: 'CAP',
   city: 'Città',
   province: 'Provincia',
   country: 'Paese',
   projects: 'Progetti Attivi',
};