//Dati del cliente.
export interface Cliente {
    id: string,
    vatNumber: string,
    name: string,
    fullAddress?: string,
    address?: string,
    streetNumber?: string,
    postalCode?: string,
    city?: string,
    province?: string,
    country?: string,
    projects: number,
    activeProjects: string[],
}