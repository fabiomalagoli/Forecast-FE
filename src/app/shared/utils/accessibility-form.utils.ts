import { User } from "../models/user.model";

export type AssignableUser = User & {
  selectedLocalRole: string;
};

export function getUserFullName(user: User): string {
  if (!user) return '';

  const firstName = user.firstName || (user as any).FirstName || '';
  const lastName = user.lastName || (user as any).LastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user.userName || (user as any).UserName || (user as any).email || (user as any).Email || '';
}

export function mapAssignedUsersToSelected(users: User[]): AssignableUser[] {
  return (users || []).map(u => {
    const rawId = u.id || (u as any).Id || (u as any).userId || (u as any).UserId || '';
    const currentRole = u.role || '';

    return {
      ...u,
      id: String(rawId).toLowerCase().trim(),
      role: currentRole,
      selectedLocalRole: currentRole
    };
  });
}
export function isAssignableUserComplete(user: AssignableUser): boolean {
  return !!user.userName && !!user.selectedLocalRole;
}