export interface CardModel {
  id: string;
  customer: string;
  activity: string;
  projectStatus: string;
  projectName?: string;
  employeeCount?: number;
  totalBudget: string;
}

export interface CardModelWithFavorite extends CardModel {
  isFavorite: boolean;
}
