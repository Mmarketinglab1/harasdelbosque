
export type UserRole = 'superadmin' | 'admin' | 'user';

export type PriceType = 'standard' | 'january' | 'february' | 'promo';

export type GuestPaymentStatus = 'pending' | 'paid';

export interface UserSession {
  username: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export interface Room {
  id: string;
  category: string;
  number: string;
  description: string;
  capacity: string;
  colorClass: string;
  basePrice: number; 
  januaryPrice: number; 
  februaryPrice: number; 
  promoPrice: number; 
  weekendPrice: number; // Nuevo campo
  selectedPriceType: PriceType; 
  videoUrl?: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  startDate: string; 
  endDate: string;   
  guestName: string;
  guestId?: string; 
  amount: number;
  notes?: string;
  color?: string;
}

export interface SpecialPrice {
  id: string;
  roomId: string | 'all';
  startDate: string;
  endDate: string;
  price: number;
  label?: string;
}

export interface GuestID {
  name?: string;
  front?: string; // base64 image
  back?: string;  // base64 image
}

export interface Guest {
  id: string;
  titular: string;
  fullName: string;
  address: string;
  email: string;
  phone: string;
  paymentStatus?: GuestPaymentStatus;
  dniDocs: {
    titular?: Omit<GuestID, 'name'>; // El nombre ya está en fullName
    guest2?: GuestID;
    guest3?: GuestID;
    guest4?: GuestID;
    guest5?: GuestID;
    guest6?: GuestID;
  };
  vehicle?: {
    brand: string;
    model: string;
    plate: string;
    notes: string;
  };
}

export interface DateCell {
  date: Date;
  dateStr: string;
  isWeekend: boolean;
  dayName: string;
  dayNumber: number;
  monthName: string;
}

export type SelectionRange = {
  roomId: string;
  startDate: string;
  endDate: string;
} | null;

export type AppView = 'grid' | 'rooms' | 'prices' | 'guests' | 'stats' | 'data' | 'public' | 'checkin';
