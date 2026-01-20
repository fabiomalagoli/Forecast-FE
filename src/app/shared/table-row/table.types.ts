export type Align = 'left' | 'center' | 'right'; // tipo di allineamento da poter utilizzare nei componenti

export type Column<T> = {
    header: string;
    value: (row: T) => string | number | null;
    align?: Align;
}; // tipo Colonna, serve per definire come le celle si adattano al tipo di colonna dinamicamente specificato