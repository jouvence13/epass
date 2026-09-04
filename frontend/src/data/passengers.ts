export type Passenger = {
  id: string;
  name: string;
  matricule: string;
  phone: string;
  stop: string;
  status: 'pending' | 'checked';
  checkedAt?: string;
};


