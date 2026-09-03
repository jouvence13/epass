export type Passenger = {
  id: string;
  name: string;
  matricule: string;
  phone: string;
  stop: string;
  status: 'pending' | 'checked';
  checkedAt?: string;
};

export const PASSENGERS: Passenger[] = [
  { id: '1', name: 'Koffi Alain', matricule: 'UAC-2022-8492', phone: '+229 97 00 11 22', stop: 'Portail Principal', status: 'pending' },
  { id: '2', name: 'Sena Dossou', matricule: 'UAC-2021-3310', phone: '+229 95 44 33 22', stop: 'Godomey', status: 'checked', checkedAt: '07:42 AM' },
  { id: '3', name: 'Aminata Sylla', matricule: 'UAC-2023-1102', phone: '+229 61 22 99 88', stop: 'Godomey', status: 'pending' },
  { id: '4', name: 'Marius Adjovi', matricule: 'UAC-2020-5521', phone: '+229 66 12 34 56', stop: 'Calavi Carrefour', status: 'checked', checkedAt: '07:39 AM' },
];
