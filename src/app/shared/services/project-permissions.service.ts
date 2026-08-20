import { inject, Injectable, computed } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectPermissionsService {
  private authService = inject(AuthenticationService);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly currentUserId = computed(() => this.currentUser()?.id || null);
  readonly isGlobalAdmin = computed(() => this.currentUser()?.role === 'Administrator');

  isUserOwner(project: Project): boolean {
    const userId = this.currentUserId();
    if (!userId || !project.ownerId) return false;
    return String(project.ownerId).toLowerCase() === String(userId).toLowerCase();
  }

  isUserLocalAdminOrManager(project: Project): boolean {
    const userId = this.currentUserId();
    const membri = project.members || (project as any)?.Members;

    if (!userId || !membri || membri.length === 0) return false;

    const memberData = membri.find((m: any) =>
      String(m.userId || m.UserId || '').toLowerCase() === String(userId).toLowerCase()
    );

    if (!memberData) return false;
    const role = String(memberData.role !== undefined ? memberData.role : memberData.Role || '');

    return role === 'Administrator' || role === 'Manager';
  }

  canManageMembers(project: Project): boolean {
    return this.isGlobalAdmin() || this.isUserOwner(project) || this.isUserLocalAdminOrManager(project);
  }
}