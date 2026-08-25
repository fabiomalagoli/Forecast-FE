import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { User } from '../../models/user.model';
import { EntityPermissionsService, PermissibleEntity } from '../../services/permissions.service';
import { getUserFullName } from '../../utils/accessibility-form.utils';
import { ProfilePictureComponent } from "../profile-picture/profile-picture.component";

export interface EntityWithMetadata extends PermissibleEntity {
  id: string;
  name?: string;
}

export interface MembersDeltaPayload {
  adds: User[];
  removes: string[];
  roleChanges: { userId: string; role: string }[];
}

@Component({
  selector: 'app-entity-members-card-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    ProfilePictureComponent
],
  templateUrl: './entity-members-card-list.component.html',
  styleUrls: ['./entity-members-card-list.component.scss']
})
export class EntityMembersCardListComponent {
  protected permissionsService = inject(EntityPermissionsService);
  private destroyRef = inject(DestroyRef);

  entity = input.required<EntityWithMetadata>();
  entityType = input.required<'project' | 'workgroup'>();
  assignedUsers = input.required<User[]>();
  assignedUsersMetaData = input<any>(null);
  availableSystemUsers = input.required<User[]>();
  availableUsersMetaData = input<any>(null);
  availableRoles = input<string[]>([]);
  isModalMode = input<boolean>(false);

  /* Signals per tener traccia delle modifiche locali */
  pendingAddedUsers = signal<User[]>([]);
  pendingRemovedUsers = signal<Set<string>>(new Set());
  pendingRoleChanges = signal<Map<string, string>>(new Map());

  membersPage = signal(1);
  membersPageSize = signal(5);

  userSectionPage = signal(1);
  userSectionPageSize = signal(5);

  filterMemberName = new FormControl('');
  filterMemberRole = new FormControl('');
  filterUserName = new FormControl('');

  memberFilterChanged = output<{ page: number; pageSize: number; searchTerm: string; role: string }>();
  availableUserFilterChanged = output<{ page: number; pageSize: number; searchTerm: string }>();
  save = output<MembersDeltaPayload>();
  cancel = output<void>();

  /* Computed per visualizzare la pagina corrente con le differenze dallo stato iniziale applicate */
  displayMembers = computed(() => {
    const serverUsers = this.assignedUsers() || [];
    const removes = this.pendingRemovedUsers();
    const roleChanges = this.pendingRoleChanges();

    return serverUsers
      .filter(u => !removes.has(this.getUserId(u)))
      .map(u => {
        const uid = this.getUserId(u);
        return roleChanges.has(uid) ? { ...u, role: roleChanges.get(uid)! } : u;
      });
  });

  hasChanges = computed(() => 
    this.pendingAddedUsers().length > 0 || 
    this.pendingRemovedUsers().size > 0 || 
    this.pendingRoleChanges().size > 0
  );

  canManage = computed(() => this.permissionsService.canManageMembers(this.entity()));

  isAdminOrOwner = computed(() => 
    this.permissionsService.isGlobalAdmin() || 
    this.permissionsService.isUserOwner(this.entity()) || 
    this.permissionsService.isUserLocalAdmin(this.entity())
  );

  selectableRoles = computed(() => {
    const roles = this.availableRoles();
    if (this.isAdminOrOwner()) {
      return roles;
    }
    return roles.filter(r => r.toLowerCase() !== 'administrator' && r.toLowerCase() !== 'admin');
  });

  /* Utenti disponibili da aggiungere (esclude chi è già assegnato o in fase di aggiunta) */
  filteredAvailableUsers = computed(() => {
    const assigned = new Set((this.assignedUsers() || []).map(u => this.getUserId(u)));
    const pendingAdds = new Set(this.pendingAddedUsers().map(u => this.getUserId(u)));
    const removes = this.pendingRemovedUsers();
    const ownerId = String(this.entity()?.ownerId || '').toLowerCase();

    // Membri assegnati che sono stati temporaneamente rimossi
    const removedMembers = (this.assignedUsers() || []).filter(u => removes.has(this.getUserId(u)));

    // Utenti disponibili dal db
    const usersAvailable = this.availableSystemUsers().filter(u => {
      const uid = this.getUserId(u);
      const isAssigned = assigned.has(uid) && !removes.has(uid);
      const isPendingAdd = pendingAdds.has(uid);
      return uid !== ownerId && !isAssigned && !isPendingAdd;
    });

    return [...removedMembers, ...usersAvailable];
  });

  constructor() {
    this.filterMemberName.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap(() => {
        this.membersPage.set(1);
        this.triggerMemberFilterChanged();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.filterMemberRole.valueChanges.pipe(
      tap(() => {
        this.membersPage.set(1);
        this.triggerMemberFilterChanged();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.filterUserName.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.triggerAvailableUsersReload(1)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private triggerMemberFilterChanged() {
    this.memberFilterChanged.emit({
      page: this.membersPage(),
      pageSize: this.membersPageSize(),
      searchTerm: this.filterMemberName.value || '',
      role: this.filterMemberRole.value || ''
    });
  }

  triggerAvailableUsersReload(page = this.userSectionPage()) {
    this.userSectionPage.set(page);
    this.availableUserFilterChanged.emit({
      page: this.userSectionPage(),
      pageSize: this.userSectionPageSize(),
      searchTerm: this.filterUserName.value || ''
    });
  }

  onMembersPageChange(event: PageEvent) {
    this.membersPageSize.set(event.pageSize);
    this.membersPage.set(event.pageIndex + 1);
    this.triggerMemberFilterChanged();
  }

  onAvailableUsersPageChange(event: PageEvent) {
    this.userSectionPageSize.set(event.pageSize);
    this.triggerAvailableUsersReload(event.pageIndex + 1);
  }

  fullName(user: User): string {
    return getUserFullName(user);
  }

  getUserId(user: User): string {
    const rawId = user.id || (user as any).Id || (user as any).userId || '';
    return String(rawId).toLowerCase().trim();
  }

  isCurrentUser(user: User): boolean {
    const currentId = this.permissionsService.currentUserId();
    return !!currentId && String(currentId).toLowerCase() === this.getUserId(user);
  }

  addMember(user: User) {
    if (!this.canManage()) return;
    const targetId = this.getUserId(user);

    // Se era un utente già presente nel db ed era stato rimosso temporaneamente
    if (this.pendingRemovedUsers().has(targetId)) {
      this.pendingRemovedUsers.update(set => {
        const updated = new Set(set);
        updated.delete(targetId);
        return updated;
      });
      // Ripristina il ruolo originale cancellando eventuali modifiche di ruolo pendenti
      this.pendingRoleChanges.update(map => {
        const updated = new Map(map);
        updated.delete(targetId);
        return updated;
      });
      return;
    }

    // Altrimenti è un nuovo utente aggiunto
    let defaultRole = user.role || 'Viewer';
    const allowed = this.selectableRoles();
    if (!allowed.includes(defaultRole)) defaultRole = allowed[0] || 'Viewer';

    this.pendingAddedUsers.update(list => [...list, { ...user, role: defaultRole }]);
  }

  removeMember(userId: string) {
    if (!this.canManage()) return;
    const targetId = userId.toLowerCase();

    if (this.pendingAddedUsers().some(u => this.getUserId(u) === targetId)) {
      this.pendingAddedUsers.update(list => list.filter(u => this.getUserId(u) !== targetId));
      return;
    }

    this.pendingRemovedUsers.update(set => new Set(set).add(targetId));
  }

  updateUserRole(userId: string, role: string) {
    if (!this.canManage()) return;
    const targetId = userId.toLowerCase();

    // Aggiornamento del ruolo di un utente nuovo non ancora salvato
    if (this.pendingAddedUsers().some(u => this.getUserId(u) === targetId)) {
      this.pendingAddedUsers.update(list => 
        list.map(u => this.getUserId(u) === targetId ? { ...u, role } : u)
      );
      return;
    }

    // Aggiornamento ruolo di un utente già presente nel db
    const serverUser = (this.assignedUsers() || []).find(u => this.getUserId(u) === targetId);
    const initialRole = serverUser?.role || '';

    this.pendingRoleChanges.update(map => {
      const updated = new Map(map);
      // Se il ruolo selezionato è identico a quello iniziale, rimuovi il delta
      if (initialRole.toLowerCase() === role.toLowerCase()) {
        updated.delete(targetId);
      } else {
        updated.set(targetId, role);
      }
      return updated;
    });
  }

  onConfirmSave() {
    this.save.emit({
      adds: this.pendingAddedUsers(),
      removes: Array.from(this.pendingRemovedUsers()),
      roleChanges: Array.from(this.pendingRoleChanges().entries()).map(([userId, role]) => ({ userId, role }))
    });
  }
}