import { Injectable } from '@angular/core'
import { Project } from '../models/project.model';
import { Customer } from '../models/customer.model';
import { Role } from '../models/role.model';
import { WorkGroup } from '../models/workgroup.model';
import { Employee } from '../models/employee.model';

export interface EntityModelMap {
    cliente: Customer;
    progetto: Project;
    risorsa: Employee;
    ruolo: Role;
    gruppo: WorkGroup;
}

type EntityName = keyof EntityModelMap;

@Injectable({ providedIn: 'root' })
export class CsvExportService {

    exportEntity<K extends EntityName>(
    entity: K, 
    data: EntityModelMap[K][],
    filename?: string
    ): void {
        console.log(`Inizio esportazione CSV per ${entity}`);       
        const finalFilename = filename ?? `${entity}_export.csv`;        
        this.exportToCsv(data, finalFilename);
    }

    exportToCsv<T extends object>(
        data: T[],
        filename = 'export.csv',
        columns?: (keyof T)[]
        ): void {
        if (!data.length) return

        const keys = columns ?? (Object.keys(data[0]) as (keyof T)[])

        const header = keys.join(',')
        const rows = data.map(row =>
            keys.map(key => this.escapeCsvValue((row as any)[key])).join(',')
        )

        const csv = [header, ...rows].join('\n')
        this.downloadCsv(csv, filename)
        }

        private escapeCsvValue(value: unknown): string {
        const str = value == null ? '' : String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    private downloadCsv(content: string, filename: string): void {
        // BOM per UTF-8 encoding in Excel
        const bom = '\uFEFF'
        const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.click()
        URL.revokeObjectURL(url)
    }
}