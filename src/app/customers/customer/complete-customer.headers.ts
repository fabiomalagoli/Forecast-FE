
import { Customer } from '../../shared/models/customer.model';

//Headers per la tabella dei clienti e per la visualizzazione dettagliata del cliente
export const COMPLETE_CUSTOMER_HEADERS: Record<keyof Customer, string> = {
   id: 'ID',
   vatNumber: 'Partita IVA',
   name: 'Nome',
   fullAddress: 'Indirizzo Completo',
   address: 'Indirizzo',
   streetNumber: 'Civico',
   postalCode: 'CAP',
   city: 'Città',
   province: 'Provincia',
   country: 'Paese',
   projects: 'Numero Progetti Attivi',
   activeProjects: 'Progetti Attivi',
};