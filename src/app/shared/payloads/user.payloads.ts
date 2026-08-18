import { User } from "../models/user.model";

type LookupOption = {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
};

export interface UserPayload {
  firstName: string;
  lastName: string;
  username: string;
  role: string | null | undefined;
  profilePictureUrl: string | null;
}

export function buildUserPayload(
  formData: any,
  lookups: {
    roles?: LookupOption[];
    selectedRole?: string | null;
  },
): UserPayload {
  return {
    firstName: formData.firstName,
    lastName: formData.lastName,
    username: formData.username,
    role: (Object.prototype.hasOwnProperty.call(lookups, 'selectedRole'))
      ? lookups.selectedRole
      : findOptionIdByName(lookups.roles || [], formData.role),
    profilePictureUrl: formData.profilePictureUrl || null,
  };
}

export function buildUserUiFallback(formData: any, fallbackUsername: string): User {
  return {
    id: formData.id || undefined,
    userName: formData.username || fallbackUsername,
    firstName: formData.firstName,
    lastName: formData.lastName,
    role: formData.role,
    photoUrl: formData.profilePictureUrl || null,
  };
}

function findOptionIdByName(options: LookupOption[], value: string | null | undefined): string | null {
  if (!value) return null;

  const normalizedValue = value.trim().toLowerCase();
  const option = options.find((item) => {
    const name = item.name || item.Name || '';
    return name.trim().toLowerCase() === normalizedValue;
  });

  return option?.id || option?.Id || null;
}