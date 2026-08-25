import { CommonModule } from "@angular/common";
import { Component, computed, inject, input } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
  selector: 'app-profile-picture',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './profile-picture.component.html',
  styleUrls: ['./profile-picture.component.scss']
})
export class ProfilePictureComponent {

    userImageUrl = input.required<string | undefined>();
    userFirstName = input.required<string>();
    userLastName = input.required<string>();
    userEmail = input<string>();

    colorClass = computed(() => {
        const key = this.userEmail() || `${this.userFirstName()}${this.userLastName()}`;
        
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = (Math.abs(hash) % 7) + 1;
        return `avatar-profile-picture--color-${index}`;
    });

    getInitials(firstName:string, lastName:string) {
        return firstName[0].toUpperCase() + lastName[0].toUpperCase();
    }

}