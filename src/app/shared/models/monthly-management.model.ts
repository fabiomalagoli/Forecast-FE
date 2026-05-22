export interface MonthlyManagement {
  id: string;
  year: number;
  month: number;
  days: number;
  tariff: number;
  isConfirmed: boolean;
  projectEmployeeId: string;
}

export interface MonthlyResourceDetail {
  month: number;
  name: string;
  days: number;
  tariffs: number;
  confirm: boolean;
};

export interface MonthlyManagementApiResponse {
  Id?: string;
  id?: string;
  Year?: number;
  year?: number;
  Month?: number;
  month?: number;
  Days?: number;
  days?: number;
  Tariff?: number;
  tariff?: number;
  IsConfirmed?: boolean;
  isConfirmed?: boolean;
  ProjectEmployeeId?: string;
  projectEmployeeId?: string;
}

export interface MonthlyManagementSavePayload {
  month: number;
  days: number;
  tariff: number;
  isConfirmed: boolean;
}
