import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, forkJoin, Observable, tap } from 'rxjs';
import { FormsModule, FormControl, NgForm, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../../../shared/services/users.service';
import { toElementId } from '../../../../shared/utils/workgourp-form.facade';
import { WorkGroup } from '../../../../shared/models/workgroup.model';
import { User } from '../../../../shared/models/user.model';
import { AssignableUser, getUserFullName, mapAssignedUsersToSelected } from '../../../../shared/utils/accessibility-form.utils';
import { RolesService } from '../../../../shared/services/roles.service';
import { WorkGroupMembersService } from '../../../../shared/services/workgroup-members.service';
import { WorkGroupPermissionsService } from '../../../../shared/services/work-group-permissions.service';


@Component({
    selector: 'app-work-group-accessibility',
    templateUrl: './work-group-accessibility.component.html',
    styleUrl: './work-group-accessibility.component.scss',
    imports: [FormsModule, ReactiveFormsModule, CommonModule],
    standalone: true,
})
export class AssignUsersToWorkGroupComponent {
    protected permissionsService = inject(WorkGroupPermissionsService);
    private workGroupMembersService = inject(WorkGroupMembersService);
    private rolesService = inject(RolesService);
    private userService = inject(UsersService);
    private destroyRef = inject(DestroyRef);

    selectedWorkGroup = input.required<WorkGroup>();
    listaUtentiAssegnati = input.required<User[]>();
    listaUtentiSelezionati = signal<AssignableUser[]>([]);

    selectedRoleFilter = signal<string>('');
    listaTotaleUtenti = signal<any[]>([]);
    listaRoles = signal<any[]>([]);
    isLoadingLookups = signal(false);

    filtroUtente = new FormControl('');
    filtroRisorsaValue = signal('');
    showAllUsersOptions = signal(false);
    userDropdownOpen = signal(false);

    saved = output<User[]>();
    cancel = output<void>();

    statusMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

    private isInitialized = false;
    private initialUserState: AssignableUser[] = [];

    isCurrentUser(user: User): boolean {
        const currentId = this.permissionsService.currentUser()?.id;
        return !!currentId && String(currentId).toLowerCase() === this.getUserId(user);
    }

    isCurrentUserAssigned(): boolean {
        const currentId = this.permissionsService.currentUser()?.id;
        if (!currentId) return false;
        return this.listaUtentiSelezionati().some(u => this.getUserId(u) === String(currentId).toLowerCase());
    }

    constructor() {
        effect(() => {
            const ra = this.listaUtentiAssegnati();

            if (ra && !this.isInitialized) {
                const assignedUsers = JSON.parse(JSON.stringify(ra)) as User[];
                const mappedUsers = mapAssignedUsersToSelected(assignedUsers);

                this.initialUserState = JSON.parse(JSON.stringify(mappedUsers));
                this.listaUtentiSelezionati.set([...mappedUsers]);
                
                if (mappedUsers.length > 0) {
                    this.isInitialized = true;
                }
            }
        });
    }

    ngOnInit() {
        this.isLoadingLookups.set(true);
        const workGroupId = this.selectedWorkGroup()?.id;

        forkJoin({
            users: this.userService.loadAvailableUsers({ groupId: workGroupId }), 
            roles: this.rolesService.loadAllRoles({ groupId: workGroupId }),
        }).subscribe({
            next: (risultati) => {
                const fullUsers = risultati.users || [];
                this.listaTotaleUtenti.set(fullUsers);
                this.listaRoles.set(risultati.roles || []);
                this.isLoadingLookups.set(false);

                if (fullUsers.length > 0) {
                    const enrichedMap = new Map(fullUsers.map(u => [this.getUserId(u), u]));
                    
                    this.listaUtentiSelezionati.update(current =>
                        current.map(selected => {
                            const match = enrichedMap.get(this.getUserId(selected));
                            return match ? { ...selected, ...match, role: selected.role } : selected;
                        })
                    );

                    this.initialUserState = JSON.parse(JSON.stringify(this.listaUtentiSelezionati()));
                    this.isInitialized = true;
                }
            },
            error: (error) => {
                this.isLoadingLookups.set(false);
                this.statusMessage.set({
                    text: 'Errore durante il caricamento dei dati: ' + (error.message || error),
                    type: 'error',
                });
            },
        });

        const filterSubscription = this.filtroUtente.valueChanges.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            tap(value => {
                this.filtroRisorsaValue.set((value || '').toLowerCase());
                this.showAllUsersOptions.set(false);
            })
        ).subscribe();

        this.destroyRef.onDestroy(() => filterSubscription.unsubscribe());
    }

    fullName(user: User): string {
        return getUserFullName(user);
    }

    getUserId(user: User): string {
        const rawId = user.id || (user as any).Id || (user as any).userId || (user as any).UserId || (user as any).user_id;
        return String(rawId || '').toLowerCase().trim();
    }

    nameFilterOptions = computed<User[]>(() => {
        const term = this.showAllUsersOptions() ? '' : this.filtroRisorsaValue();
        const roleFilter = this.selectedRoleFilter();
        const users = this.listaTotaleUtenti();
        const ownerId = String(this.selectedWorkGroup()?.ownerId || (this.selectedWorkGroup() as any)?.OwnerId || '').toLowerCase();

        const selectedIds = new Set(this.listaUtentiSelezionati().map(u => this.getUserId(u)));
        
        let availableUsers = users.filter(u => 
            u.userName?.toLowerCase() !== 'system_user' && 
            this.getUserId(u) !== ownerId &&
            !selectedIds.has(this.getUserId(u))
        );

        if (roleFilter) {
            availableUsers = availableUsers.filter(u =>
                (u.role || '').toLowerCase() === roleFilter.toLowerCase()
            );
        }

        if (term) {
            availableUsers = availableUsers.filter(u =>
                this.fullName(u).toLowerCase().includes(term) ||
                (u.userName || '').toLowerCase().includes(term)
            );
        }

        return availableUsers;
    });

    selectUserFilter(user: User) {
        const userId = this.getUserId(user);
        const alreadySelected = this.listaUtentiSelezionati().some(s => this.getUserId(s) === userId);

        if (!alreadySelected) {
            const defaultRole = user.role || this.selectedRoleFilter() || (this.listaRoles()[0]?.name || '');
            this.listaUtentiSelezionati.update(selected => [
                ...selected,
                {
                    ...user,
                    role: defaultRole,
                    selectedLocalRole: defaultRole
                }
            ]);
        }

        this.filtroUtente.setValue('');
        this.filtroRisorsaValue.set('');
        this.userDropdownOpen.set(false);
        this.showAllUsersOptions.set(false);
        this.onFieldChange();
    }

    removeSelectedUser(userId: string) {
        const targetId = String(userId).toLowerCase();
        this.listaUtentiSelezionati.update(selected =>
            selected.filter(u => this.getUserId(u) !== targetId)
        );
        this.onFieldChange();
    }

    updateUserRole(userId: string, role: string) {
        const targetId = String(userId).toLowerCase();
        const currentUserId = String(this.permissionsService.currentUser()?.id || '').toLowerCase();

        if (targetId === currentUserId) {
            return;
        }

        this.listaUtentiSelezionati.update(selected =>
            selected.map(u =>
                this.getUserId(u) === targetId
                    ? { ...u, role: role, selectedLocalRole: role }
                    : u
            )
        );
        this.onFieldChange();
    }

    isChanged(): boolean {
        const currentList = this.listaUtentiSelezionati();
        const initialList = this.initialUserState;

        if (currentList.length !== initialList.length) return true;

        const currentMap = new Map(currentList.map(u => [this.getUserId(u), u.role || '']));
        for (const initialUser of initialList) {
            const initId = this.getUserId(initialUser);
            if (!currentMap.has(initId)) return true;
            if (currentMap.get(initId) !== (initialUser.role || '')) return true;
        }

        return false;
    }

    hasValidResources(): boolean {
        const risorse = this.listaUtentiSelezionati();
        if (!risorse || risorse.length === 0) return true;
        return risorse.every(u => !!u.role && u.role.trim() !== '');
    }

    isSubmitDisabled(form: NgForm): boolean {
        if (this.isLoadingLookups()) return true;
        if (!this.hasValidResources()) return true;
        return !this.isChanged(); // Abilitato solo quando ci sono reali modifiche agli utenti/ruoli
    }

    submit(form: NgForm) {
        if (form.invalid) return;

        const workGroupId = this.selectedWorkGroup().id;
        const currentList = this.listaUtentiSelezionati();
        const initialList = this.initialUserState;

        const initialMap = new Map<string, string>(
            initialList.map(u => [this.getUserId(u).toLowerCase().trim(), String(u.role || '').trim()])
        );

        const requests: Observable<any>[] = [];

        for (const user of currentList) {
            const userId = this.getUserId(user).toLowerCase().trim();
            if (!userId) continue;

            const isAlreadyMember = initialMap.has(userId);
            const oldRole = initialMap.get(userId);
            const newRole = String(user.role || '').trim();

            if (!isAlreadyMember) {
                requests.push(this.workGroupMembersService.addMemberToWorkGroup(workGroupId, userId, newRole));
            } else if (oldRole !== newRole) {
                requests.push(this.workGroupMembersService.updateMemberRole(workGroupId, userId, newRole));
            }
        }

        const currentSet = new Set(currentList.map(u => this.getUserId(u).toLowerCase().trim()));
        for (const initialUser of initialList) {
            const initId = this.getUserId(initialUser).toLowerCase().trim();
            if (initId && !currentSet.has(initId)) {
                requests.push(this.workGroupMembersService.removeMemberFromWorkGroup(workGroupId, initId));
            }
        }

        if (requests.length === 0) {
            this.cancel.emit();
            return;
        }

        forkJoin(requests).subscribe({
            next: () => {
                this.saved.emit(currentList);
                this.cancel.emit();
            },
            error: (error) => {
                this.statusMessage.set({ 
                    text: `Errore durante il salvataggio: ${error.message || error}`, 
                    type: 'error' 
                });
            }
        });
    }

    onCancel() {
        this.cancel.emit();
    }

    onFieldChange() {
        this.statusMessage.set(null);
    }

    optionName(option: any): string {
        return option?.name || option?.Name || option || '';
    }

    onUserFilterFocus() {
        this.showAllUsersOptions.set(true);
        this.userDropdownOpen.set(true);
    }

    onUserFilterInput() {
        this.showAllUsersOptions.set(false);
        this.userDropdownOpen.set(true);
    }

    toggleUserFilterDropdown() {
        this.showAllUsersOptions.set(true);
        this.userDropdownOpen.update(open => !open);
    }

    clearNameFilter() {
        this.filtroUtente.setValue('');
        this.filtroRisorsaValue.set('');
        this.userDropdownOpen.set(false);
        this.showAllUsersOptions.set(false);
    }

    toId(key: string, i: number): string {
        return toElementId('risorsa', key, i);
    }

    @HostListener('document:mousedown', ['$event'])
    onDocumentMouseDown(event: MouseEvent) {
        const target = event.target as Element | null;
        if (!target?.closest('.resource-name-filter-combo') && !target?.closest('.resource-dropdown') && !target?.closest('.resource-results')) {
            this.userDropdownOpen.set(false);
            this.showAllUsersOptions.set(false);
        }
    }
}