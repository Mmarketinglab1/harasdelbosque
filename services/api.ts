import { createClient } from '@supabase/supabase-js';
import { Reservation, Room, SpecialPrice, Guest } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const runtimeEnv = (window as any).process?.env || {};
const resolvedSupabaseUrl = supabaseUrl || runtimeEnv.VITE_SUPABASE_URL || runtimeEnv.SUPABASE_URL;
const resolvedSupabaseAnonKey = supabaseAnonKey || runtimeEnv.VITE_SUPABASE_ANON_KEY || runtimeEnv.SUPABASE_ANON_KEY;

export const supabase = (resolvedSupabaseUrl && resolvedSupabaseAnonKey)
  ? createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey)
  : null;

const LS_KEYS = {
  ROOMS: 'haras_rooms',
  RESERVATIONS: 'haras_reservations',
  SPECIAL_PRICES: 'haras_special_prices',
  GUESTS: 'haras_guests'
};

const saveToLS = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getFromLS = (key: string, defaultValue: any) => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const serverRequest = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Error HTTP ${response.status}`);
  }

  return response.json();
};

const normalizeRoom = (r: any): Room => ({
  ...r,
  basePrice: Number(r.basePrice || 0),
  januaryPrice: Number(r.januaryPrice || 0),
  februaryPrice: Number(r.februaryPrice || 0),
  promoPrice: Number(r.promoPrice || 0),
  weekendPrice: Number(r.weekendPrice || 0)
});

export const api = {
  testConnection: async () => {
    if (!supabase) {
      try {
        const result = await serverRequest<{ ok: boolean, supabase: boolean }>('/api/health');
        return result.supabase
          ? { success: true, message: 'Conexion exitosa con servidor.' }
          : { success: false, message: 'El servidor no tiene Supabase configurado.' };
      } catch (e: any) {
        return { success: false, message: e.message || 'Error al conectar.' };
      }
    }

    try {
      const { error } = await supabase.from('rooms').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: 'Conexion exitosa con Supabase.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al conectar.' };
    }
  },

  getRooms: async (): Promise<Room[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('rooms').select('*').order('number');
        if (error) throw error;
        if (data) {
          const normalized = data.map(normalizeRoom);
          saveToLS(LS_KEYS.ROOMS, normalized);
          return normalized;
        }
      } catch (err) {
        console.error('Error al obtener unidades de Supabase:', err);
      }
    }

    try {
      const data = await serverRequest<Room[]>('/api/admin/rooms');
      const normalized = data.map(normalizeRoom);
      saveToLS(LS_KEYS.ROOMS, normalized);
      return normalized;
    } catch (err) {
      console.error('Error al obtener unidades del servidor:', err);
    }

    return getFromLS(LS_KEYS.ROOMS, []);
  },

  saveRoom: async (room: Room): Promise<Room> => {
    const roomToSave = {
      id: room.id,
      category: room.category,
      number: room.number,
      description: room.description,
      capacity: room.capacity,
      colorClass: room.colorClass,
      basePrice: Number(room.basePrice || 0),
      januaryPrice: Number(room.januaryPrice || 0),
      februaryPrice: Number(room.februaryPrice || 0),
      promoPrice: Number(room.promoPrice || 0),
      weekendPrice: Number(room.weekendPrice || 0),
      selectedPriceType: room.selectedPriceType || 'standard',
      videoUrl: room.videoUrl || ''
    };

    const rooms = getFromLS(LS_KEYS.ROOMS, []);
    const updated = rooms.find((r: any) => r.id === room.id)
      ? rooms.map((r: any) => r.id === room.id ? roomToSave : r)
      : [...rooms, roomToSave];
    saveToLS(LS_KEYS.ROOMS, updated);

    if (supabase) {
      const { error } = await supabase.from('rooms').upsert(roomToSave, { onConflict: 'id' });
      if (error) throw error;
    } else {
      await serverRequest('/api/admin/rooms', { method: 'POST', body: JSON.stringify(roomToSave) });
    }

    return roomToSave as any;
  },

  deleteRoom: async (id: string): Promise<void> => {
    const rooms = getFromLS(LS_KEYS.ROOMS, []);
    saveToLS(LS_KEYS.ROOMS, rooms.filter((r: any) => r.id !== id));
    if (supabase) await supabase.from('rooms').delete().eq('id', id);
    else await serverRequest(`/api/admin/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getReservations: async (): Promise<Reservation[]> => {
    if (supabase) {
      const { data } = await supabase.from('reservations').select('*');
      if (data) {
        saveToLS(LS_KEYS.RESERVATIONS, data);
        return data;
      }
    }

    try {
      const data = await serverRequest<Reservation[]>('/api/admin/reservations');
      saveToLS(LS_KEYS.RESERVATIONS, data);
      return data;
    } catch (err) {
      console.error('Error al obtener reservas del servidor:', err);
    }

    return getFromLS(LS_KEYS.RESERVATIONS, []);
  },

  saveReservation: async (res: Reservation): Promise<Reservation> => {
    const resToSave = {
      id: res.id,
      roomId: res.roomId,
      startDate: res.startDate,
      endDate: res.endDate,
      guestName: res.guestName,
      guestId: res.guestId,
      amount: Number(res.amount || 0),
      notes: res.notes || '',
      color: res.color || ''
    };

    const reservations = getFromLS(LS_KEYS.RESERVATIONS, []);
    const updated = reservations.find((r: any) => r.id === res.id)
      ? reservations.map((r: any) => r.id === res.id ? resToSave : r)
      : [...reservations, resToSave];
    saveToLS(LS_KEYS.RESERVATIONS, updated);

    if (supabase) {
      const { error } = await supabase.from('reservations').upsert(resToSave, { onConflict: 'id' });
      if (error) throw error;
    } else {
      await serverRequest('/api/admin/reservations', { method: 'POST', body: JSON.stringify(resToSave) });
    }

    return resToSave as any;
  },

  deleteReservation: async (id: string): Promise<void> => {
    const reservations = getFromLS(LS_KEYS.RESERVATIONS, []);
    saveToLS(LS_KEYS.RESERVATIONS, reservations.filter((r: any) => r.id !== id));
    if (supabase) await supabase.from('reservations').delete().eq('id', id);
    else await serverRequest(`/api/admin/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getGuests: async (): Promise<Guest[]> => {
    if (supabase) {
      const { data } = await supabase.from('guests').select('*');
      if (data) {
        saveToLS(LS_KEYS.GUESTS, data);
        return data;
      }
    }

    try {
      const data = await serverRequest<Guest[]>('/api/admin/guests');
      saveToLS(LS_KEYS.GUESTS, data);
      return data;
    } catch (err) {
      console.error('Error al obtener huespedes del servidor:', err);
    }

    return getFromLS(LS_KEYS.GUESTS, []);
  },

  saveGuest: async (guest: Guest): Promise<Guest> => {
    const guestToSave = {
      id: guest.id,
      titular: guest.titular,
      fullName: guest.fullName,
      address: guest.address || '',
      email: guest.email || '',
      phone: guest.phone || '',
      paymentStatus: guest.paymentStatus || 'pending',
      dniDocs: guest.dniDocs || {},
      vehicle: guest.vehicle || {}
    };

    const guests = getFromLS(LS_KEYS.GUESTS, []);
    const updated = guests.find((g: any) => g.id === guest.id)
      ? guests.map((g: any) => g.id === guest.id ? guestToSave : g)
      : [...guests, guestToSave];
    saveToLS(LS_KEYS.GUESTS, updated);

    if (supabase) {
      const { error } = await supabase.from('guests').upsert(guestToSave, { onConflict: 'id' });
      if (error) throw error;
    } else {
      await serverRequest('/api/admin/guests', { method: 'POST', body: JSON.stringify(guestToSave) });
    }

    return guestToSave as any;
  },

  deleteGuest: async (id: string): Promise<void> => {
    const guests = getFromLS(LS_KEYS.GUESTS, []);
    saveToLS(LS_KEYS.GUESTS, guests.filter((g: any) => g.id !== id));
    if (supabase) await supabase.from('guests').delete().eq('id', id);
    else await serverRequest(`/api/admin/guests/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getSpecialPrices: async (): Promise<SpecialPrice[]> => {
    if (supabase) {
      const { data } = await supabase.from('special_prices').select('*');
      if (data) {
        saveToLS(LS_KEYS.SPECIAL_PRICES, data);
        return data;
      }
    }

    try {
      const data = await serverRequest<SpecialPrice[]>('/api/admin/special-prices');
      saveToLS(LS_KEYS.SPECIAL_PRICES, data);
      return data;
    } catch (err) {
      console.error('Error al obtener precios especiales del servidor:', err);
    }

    return getFromLS(LS_KEYS.SPECIAL_PRICES, []);
  },

  saveSpecialPrice: async (price: SpecialPrice): Promise<SpecialPrice> => {
    const prices = getFromLS(LS_KEYS.SPECIAL_PRICES, []);
    saveToLS(LS_KEYS.SPECIAL_PRICES, [...prices, price]);
    if (supabase) await supabase.from('special_prices').upsert(price, { onConflict: 'id' });
    else await serverRequest('/api/admin/special-prices', { method: 'POST', body: JSON.stringify(price) });
    return price;
  },

  deleteSpecialPrice: async (id: string): Promise<void> => {
    const prices = getFromLS(LS_KEYS.SPECIAL_PRICES, []);
    saveToLS(LS_KEYS.SPECIAL_PRICES, prices.filter((p: any) => p.id !== id));
    if (supabase) await supabase.from('special_prices').delete().eq('id', id);
    else await serverRequest(`/api/admin/special-prices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getFullData: async () => {
    if (!supabase) return serverRequest('/api/admin/full-data');
    const rooms = await api.getRooms();
    const reservations = await api.getReservations();
    const special_prices = await api.getSpecialPrices();
    const guests = await api.getGuests();
    return { rooms, reservations, special_prices, guests };
  },

  restoreFullData: async (data: any) => {
    if (!supabase) {
      await serverRequest('/api/admin/full-data', { method: 'POST', body: JSON.stringify(data) });
      return true;
    }

    if (data.rooms) for (const r of data.rooms) await api.saveRoom(r);
    if (data.reservations) for (const r of data.reservations) await api.saveReservation(r);
    if (data.guests) for (const g of data.guests) await api.saveGuest(g);
    if (data.special_prices) for (const sp of data.special_prices) await api.saveSpecialPrice(sp);
    return true;
  }
};
