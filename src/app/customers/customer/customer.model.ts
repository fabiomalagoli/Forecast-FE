import { Project } from "../../projects/project/project.model";

//Dati del cliente.
export interface Customer {
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
    activeProjects: Project[],
}