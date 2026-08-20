import { inject, Injectable, computed } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { WorkGroup } from '../models/workgroup.model';

@Injectable({
  providedIn: 'root'
})
export class WorkGroupPermissionsService {
  private authService = inject(AuthenticationService);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly currentUserId = computed(() => this.currentUser()?.id || null);
  readonly isGlobalAdmin = computed(() => this.currentUser()?.role === 'Administrator');

  isUserOwner(workGroup: WorkGroup): boolean {
    const userId = this.currentUserId();
    if (!userId || !workGroup.ownerId) return false;
    return String(workGroup.ownerId).toLowerCase() === String(userId).toLowerCase();
  }

  isUserLocalAdminOrManager(workGroup: WorkGroup): boolean {
    const userId = this.currentUserId();
    const membri = workGroup.members || (workGroup as any)?.Members;

    if (!userId || !membri || membri.length === 0) return false;

    const memberData = membri.find((m: any) =>
      String(m.userId || m.UserId || '').toLowerCase() === String(userId).toLowerCase()
    );

    if (!memberData) return false;
    const role = String(memberData.role !== undefined ? memberData.role : memberData.Role || '');

    return role === 'Administrator' || role === 'Manager';
  }

  isUserLocalAdmin(workGroup: WorkGroup): boolean {
    const userId = this.currentUserId();
    const membri = workGroup.members || (workGroup as any)?.Members;
    
    if (!userId || !membri || membri.length === 0) return false;

    const memberData = membri.find((m: any) =>
      String(m.userId || m.UserId || '').toLowerCase() === String(userId).toLowerCase()
    );

    if (!memberData) return false;
    const role = String(memberData.role !== undefined ? memberData.role : memberData.Role || '');

    return role === 'Administrator';

  }

  canManageMembers(workGroup: WorkGroup): boolean {
    return this.isGlobalAdmin() || this.isUserOwner(workGroup) || this.isUserLocalAdminOrManager(workGroup);
  }

  canDeleteWorkGroup(workGroup: WorkGroup): boolean {
    return this.isGlobalAdmin() || this.isUserOwner(workGroup) || this.isUserLocalAdmin(workGroup);
  }

}