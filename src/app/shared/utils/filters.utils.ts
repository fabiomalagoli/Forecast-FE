export interface ProjectFilters {
  companyId?: string | null;
  customerId?: string | null;
  projectStatusId?: string | null;
  searchTerm?: string | null;
}

export interface ProjectFiltersWithYear extends ProjectFilters {
  year: number | null
}

export interface EmployeeFilters {
    companyId?: string | null;
    jobRoleId?: string | null;
    jobRoleLevelId?: string | null;
    searchTerm?: string | null;
}