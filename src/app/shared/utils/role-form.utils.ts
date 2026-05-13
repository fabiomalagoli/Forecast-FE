export function normalizeRoleForForm(role: any): { id: string; name: string } {
  return {
    id: role?.id || role?.Id || role?.ID || '',
    name: role?.name || role?.Name || '',
  };
} // normalizzazione del dato di tipo Role. Usato any per gestire eventuali discrepanze fra diversi tipi di nomenclatura dei parametri

export function createEmptyRoleFormData(): { name: string } {
  return {
    name: '',
  };
} // dati per il form di creazione di un nuovo ruolo
