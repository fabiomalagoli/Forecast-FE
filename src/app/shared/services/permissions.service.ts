import { inject, Injectable, computed } from '@angular/core';
import { AuthenticationService } from './authentication.service';

export interface PermissibleMember {
  userId?: string | number;
  UserId?: string | number;
  role?: string;
  Role?: string;
}

export interface PermissibleEntity {
  ownerId?: string | number;
  members?: PermissibleMember[];
  Members?: PermissibleMember[];
}

@Injectable({
  providedIn: 'root'
})
export class EntityPermissionsService {
  private authService = inject(AuthenticationService);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly currentUserId = computed(() => this.currentUser()?.id || null);
  readonly isGlobalAdmin = computed(() => this.currentUser()?.role === 'Administrator');

  isUserOwner(entity?: PermissibleEntity | null): boolean {
    const userId = this.currentUserId();
    if (!userId || !entity?.ownerId) return false;
    return String(entity.ownerId).toLowerCase() === String(userId).toLowerCase();
  }

  private getMemberRole(entity?: PermissibleEntity | null): string | null {
    const userId = this.currentUserId();
    const membri = entity?.members || entity?.Members;

    if (!userId || !membri || membri.length === 0) return null;

    const memberData = membri.find((m) =>
      String(m.userId || m.UserId || '').toLowerCase() === String(userId).toLowerCase()
    );

    if (!memberData) return null;
    return String(memberData.role !== undefined ? memberData.role : memberData.Role || '');
  }

  isUserLocalAdminOrManager(entity?: PermissibleEntity | null): boolean {
    const role = this.getMemberRole(entity);
    return role === 'Administrator' || role === 'Manager';
  }

  isUserLocalAdmin(entity?: PermissibleEntity | null): boolean {
    return this.getMemberRole(entity) === 'Administrator';
  }

  canManageMembers(entity?: PermissibleEntity | null): boolean {
    if (!entity) return this.isGlobalAdmin();
    return this.isGlobalAdmin() || this.isUserOwner(entity) || this.isUserLocalAdminOrManager(entity);
  }

  canDelete(entity?: PermissibleEntity | null): boolean {
    if (!entity) return this.isGlobalAdmin();
    return this.isGlobalAdmin() || this.isUserOwner(entity) || this.isUserLocalAdmin(entity);
  }
}