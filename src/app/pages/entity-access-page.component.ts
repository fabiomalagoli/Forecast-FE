import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { EntityMembersCardListComponent, EntityWithMetadata, MembersDeltaPayload } from '../shared/components/available-users-list/entity-members-card-list.component';
import { User } from '../shared/models/user.model';
import { ProjectsService } from '../shared/services/projects.service';
import { WorkGroupsService } from '../shared/services/workgroups.service';
import { ProjectMembersService } from '../shared/services/project-members.service';
import { WorkGroupMembersService } from '../shared/services/workgroup-members.service';
import { UsersService } from '../shared/services/users.service';
import { RolesService } from '../shared/services/roles.service';
import { SnackbarService } from '../shared/services/snackbar.service';
import { NotifyAction } from '../shared/enums/notify.enum';

@Component({
  selector: 'app-entity-access-page',
  standalone: true,
  imports: [EntityMembersCardListComponent, MatProgressSpinnerModule],
  template: `
    @if (isLoading()) {
      <div class="loading-overlay">
        <mat-progress-spinner mode="indeterminate" diameter="80"></mat-progress-spinner>
      </div>
    } @else if (entity()) {
      <app-entity-members-card-list
        [entity]="entity()!"
        [entityType]="entityType"
        [assignedUsers]="assignedUsers()"
        [assignedUsersMetaData]="membersMetaData()"
        [availableSystemUsers]="availableSystemUsers()"
        [availableUsersMetaData]="availableUsersMetaData()"
        [availableRoles]="availableRoles()"
        [isModalMode]="false"
        (memberFilterChanged)="onMemberFilterChanged($event)"
        (availableUserFilterChanged)="onAvailableUserFilterChanged($event)"
        (save)="onSave($event)"
        (cancel)="onCancel()">
      </app-entity-members-card-list>
    }
  `,
  styles: [`.loading-overlay { display: flex; justify-content: center; align-items: center; min-height: 300px; }`]
})
export class EntityAccessPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private destroyRef = inject(DestroyRef);
  
  private projectsService = inject(ProjectsService);
  private workGroupsService = inject(WorkGroupsService);
  private projectMembersService = inject(ProjectMembersService);
  private workGroupMembersService = inject(WorkGroupMembersService);
  private userService = inject(UsersService);
  private rolesService = inject(RolesService);
  private snackbarService = inject(SnackbarService);

  entityType: 'project' | 'workgroup' = 'project';
  entityId = '';

  isLoading = signal(true);
  entity = signal<EntityWithMetadata | null>(null);
  
  assignedUsers = signal<User[]>([]);
  membersMetaData = signal<any>(null);

  availableSystemUsers = signal<User[]>([]);
  availableUsersMetaData = signal<any>(null);

  availableRoles = signal<string[]>([]);

  ngOnInit() {
    this.entityType = this.route.snapshot.data['entityType'] || 'project';
    this.entityId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.entityId) {
      this.snackbarService.error(NotifyAction.Caricamento, ['ID non valido']);
      this.onCancel();
      return;
    }

    this.loadInitialEntityAndRoles();
    this.loadMembers(1, 5);
    this.loadAvailableUsers(1, 5);
  }

  private loadInitialEntityAndRoles() {
    const isProject = this.entityType === 'project';

    const loadEntity$: Observable<any[]> = isProject
      ? this.projectsService.loadProjects(1, 100)
      : this.workGroupsService.loadAllWorkGroups();

    const loadRoles$: Observable<any[]> = this.rolesService.loadAllRoles(
      isProject ? { projectId: this.entityId } : { groupId: this.entityId }
    );

    loadEntity$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((entities: any[]) => {
      const found = entities.find(e => String(e.id).toLowerCase() === this.entityId.toLowerCase());
      if (found) {
        // Passa anche 'members' per consentire a EntityPermissionsService di computare con computed canManage() e CanDelete()
        this.entity.set({ 
          id: found.id, 
          name: found.name, 
          ownerId: found.ownerId || found.OwnerId,
          members: found.members || found.Members || [] 
        });
      }
    });

    loadRoles$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((roles: any[]) => {
      this.availableRoles.set((roles || []).map((r: any) => r.name || r.Name || r));
    });
  }

  loadMembers(page: number, pageSize: number, filters?: { searchTerm?: string; role?: string }) {
    const isProject = this.entityType === 'project';
    const members$ = isProject
      ? this.projectMembersService.getProjectMembers(this.entityId, page, pageSize, filters)
      : this.workGroupMembersService.getWorkGroupMembers(this.entityId, page, pageSize, filters);

    members$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.assignedUsers.set(res.members);
        this.membersMetaData.set(res.pagination);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadAvailableUsers(page: number, pageSize: number, filters?: { searchTerm?: string }) {
    const options = this.entityType === 'project' 
      ? { projectId: this.entityId } 
      : { groupId: this.entityId };

    this.userService.loadUsers(page, pageSize, filters, options).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users: User[]) => {
        this.availableSystemUsers.set(users);
        this.availableUsersMetaData.set(this.userService.userPaginationData());
      }
    });
  }

  onMemberFilterChanged(event: { page: number; pageSize: number; searchTerm: string; role: string }) {
    this.loadMembers(event.page, event.pageSize, { searchTerm: event.searchTerm, role: event.role });
  }

  onAvailableUserFilterChanged(event: { page: number; pageSize: number; searchTerm: string }) {
    this.loadAvailableUsers(event.page, event.pageSize, { searchTerm: event.searchTerm });
  }

  onSave(payload: MembersDeltaPayload) {
    this.isLoading.set(true);
    const isProject = this.entityType === 'project';
    const requests: Observable<any>[] = [];

    // Chiamate per i nuovi membri aggiunti grazie al payload dei membri delle entità dati Projects e WorkGroups
    for (const user of payload.adds) {
      const uId = String(user.id).toLowerCase();
      const role = user.role || 'Viewer';
      requests.push(
        isProject
          ? this.projectMembersService.addMemberToProject(this.entityId, uId, role)
          : this.workGroupMembersService.addMemberToWorkGroup(this.entityId, uId, role)
      );
    }

    // Chiamate per il cambio dei ruoli dei membri esistenti
    for (const change of payload.roleChanges) {
      requests.push(
        isProject
          ? this.projectMembersService.updateMemberRole(this.entityId, change.userId, change.role)
          : this.workGroupMembersService.updateMemberRole(this.entityId, change.userId, change.role)
      );
    }

    // Chiamate per le rimozioni
    for (const userId of payload.removes) {
      requests.push(
        isProject
          ? this.projectMembersService.removeMemberFromProject(this.entityId, userId)
          : this.workGroupMembersService.removeMemberFromWorkGroup(this.entityId, userId)
      );
    }

    if (requests.length === 0) {
      this.isLoading.set(false);
      return;
    }

    forkJoin(requests).pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.snackbarService.success(NotifyAction.Aggiornamento, ['accessibilità']);
        this.loadMembers(1, 5);
        this.loadAvailableUsers(1, 5);
      },
      error: () => {
        this.snackbarService.error(NotifyAction.Salvataggio, ['modifiche accessibilità']);
      }
    });
  }

  onCancel() {
    this.location.back();
  }
}