import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, forkJoin, Observable, tap } from 'rxjs';
import { FormsModule, FormControl, NgForm, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../../../shared/services/users.service';
import { toElementId } from '../../../../shared/utils/project-form.utils';
import { Project } from '../../../../shared/models/project.model';
import { User } from '../../../../shared/models/user.model';
import { AssignableUser, getUserFullName, mapAssignedUsersToSelected } from '../../../../shared/utils/accessibility-form.utils';
import { RolesService } from '../../../../shared/services/roles.service';
import { ProjectMembersService } from '../../../../shared/services/project-members.service';
import { ProjectPermissionsService } from '../../../../shared/services/project-permissions.service';

@Component({
    selector: 'app-project-accessibility',
    templateUrl: './project-accessibility.component.html',
    styleUrl: './project-accessibility.component.scss',
    imports: [FormsModule, ReactiveFormsModule, CommonModule],
    standalone: true,
})
export class AssignUsersToProjectComponent {
    protected permissionsService = inject(ProjectPermissionsService);
    private projectMembersService = inject(ProjectMembersService);
    private rolesService = inject(RolesService);
    private userService = inject(UsersService);
    private destroyRef = inject(DestroyRef);
    private initializedState = false;

    selectedProject = input.required<Project>();
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
            if (!this.initializedState && ra) {
                const assignedUsers = JSON.parse(JSON.stringify(ra)) as User[];
                const mappedUsers = mapAssignedUsersToSelected(assignedUsers);

                this.initialUserState = JSON.parse(JSON.stringify(mappedUsers));
                this.listaUtentiSelezionati.set([...mappedUsers]);
                this.initializedState = true;
            }
        });
    }

    ngOnInit() {
        this.isLoadingLookups.set(true);
        const projectId = this.selectedProject()?.id;

        forkJoin({
            users: this.userService.loadAvailableUsers(projectId),
            roles: this.rolesService.loadAllRoles(projectId),
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
                }
            },
            error: (error) => {
                this.isLoadingLookups.set(false);
                this.statusMessage.set({
                    text: 'Errore durante il caricamento dei dati: ' + error.message,
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
        const ownerId = String(this.selectedProject()?.ownerId || (this.selectedProject() as any)?.OwnerId || '').toLowerCase();

        const selectedIds = new Set(this.listaUtentiSelezionati().map(u => this.getUserId(u)));
        
        let availableUsers = users.filter(u => 
            u.userName?.toLowerCase() !== 'system_user' && 
            this.getUserId(u) !== ownerId && // <-- ESCLUDE L'OWNER
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

        const projectId = this.selectedProject().id;
        const currentList = this.listaUtentiSelezionati();
        const initialList = this.initialUserState;

        const updateUsers: User[] = currentList.map(user => ({
            ...user,
            role: user.role || ''
        }));

        const currentMap = new Map(currentList.map(u => [this.getUserId(u), u.role]));
        const initialMap = new Map(initialList.map(u => [this.getUserId(u), u.role]));

        const requests: Observable<any>[] = [];

        for (const user of currentList) {
            const userId = this.getUserId(user);
            
            if (!userId) {
                console.error('Impossibile salvare l\'utente: ID non trovato nell\'oggetto', user);
                continue;
            }

            if (!initialMap.has(userId)) {
                requests.push(this.projectMembersService.addMemberToProject(projectId, userId, user.role!));
            } else if (initialMap.get(userId) !== user.role) {
                requests.push(this.projectMembersService.updateMemberRole(projectId, userId, user.role!));
            }
        }

        for (const initialUser of initialList) {
            const initId = this.getUserId(initialUser);
            if (initId && !currentMap.has(initId)) {
                requests.push(this.projectMembersService.removeMemberFromProject(projectId, initId));
            }
        }

        if (requests.length === 0) {
            this.cancel.emit();
            return;
        }

        forkJoin(requests).subscribe({
            next: () => {
                this.statusMessage.set({ text: 'Membri aggiornati con successo!', type: 'success' });
                this.saved.emit(updateUsers);
                form.resetForm();
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