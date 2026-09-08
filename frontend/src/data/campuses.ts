/**
 * Liste officielle des Campus Universitaires Nationaux du Bénin
 */

export interface CampusData {
  id: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  description: string;
  latitude: number;
  longitude: number;
  zoom: number;
}

export const BENIN_CAMPUSES: CampusData[] = [
  {
    id: 'uac',
    code: 'UAC',
    name: "Université d'Abomey-Calavi",
    shortName: 'UAC Abomey-Calavi',
    city: 'Abomey-Calavi',
    description: 'Campus Central & Facultés (FASHS, FASEG, EPAC, FSS, FAST)',
    latitude: 6.4474,
    longitude: 2.3557,
    zoom: 15.5,
  },
  {
    id: 'up',
    code: 'UP',
    name: 'Université de Parakou',
    shortName: 'UP Parakou',
    city: 'Parakou',
    description: 'Pôle Universitaire du Septentrion (Albarika, FDSP, FASEG, FLASH)',
    latitude: 9.3520,
    longitude: 2.6130,
    zoom: 15.2,
  },
  {
    id: 'una',
    code: 'UNA',
    name: "Université Nationale d'Agriculture",
    shortName: 'UNA Porto-Novo / Kétou',
    city: 'Porto-Novo',
    description: 'Sciences Agronomiques, Agro-pastorales & Environnement (Porto-Novo & Kétou)',
    latitude: 6.4969,
    longitude: 2.6289,
    zoom: 15.0,
  },
  {
    id: 'unstim',
    code: 'UNSTIM',
    name: 'Université Nationale des Sciences (UNSTIM)',
    shortName: 'UNSTIM Lokossa / Abomey',
    city: 'Lokossa',
    description: 'Sciences, Technologies, Ingénierie & Mathématiques (INSAE, INSTI, ENSET)',
    latitude: 7.1840,
    longitude: 1.9890,
    zoom: 15.0,
  },
];
