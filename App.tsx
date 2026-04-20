
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Reservation, SelectionRange, DateCell, Room, AppView, SpecialPrice, Guest, UserSession } from './types';
import { ROOMS as INITIAL_ROOMS, COLORS } from './constants';
import { getDaysArray, getDaysUntilEndOfYear } from './utils/dateUtils';
import ReservationGrid from './components/ReservationGrid';
import Sidebar from './components/Sidebar';
import ReservationModal from './components/ReservationModal';
import RoomManager from './components/RoomManager';
import SpecialPriceManager from './components/SpecialPriceManager';
import GuestManager from './components/GuestManager';
import StatisticsManager from './components/StatisticsManager';
import DataCenter from './components/DataCenter';
import PublicPortal from './components/PublicPortal';
import CheckInPortal from './components/CheckInPortal';
import Login from './components/Login';
import { api, supabase } from './services/api';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('haras_session');
      return saved ? JSON.parse(saved) : { username: '', role: 'user', isLoggedIn: false };
    } catch {
      return { username: '', role: 'user', isLoggedIn: false };
    }
  });

  const [view, setView] = useState<AppView>('grid');
  const [targetGuestId, setTargetGuestId] = useState<string | null>(null);
  const [startDate] = useState(new Date('2025-12-01T00:00:00'));
  
  const [lastYearInCalendar, setLastYearInCalendar] = useState<number>(() => {
    const saved = localStorage.getItem('haras_calendar_year');
    return saved ? parseInt(saved) : 2026;
  });

  const daysCount = useMemo(() => {
    return getDaysUntilEndOfYear(startDate, lastYearInCalendar);
  }, [startDate, lastYearInCalendar]);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');

    if (viewParam === 'checkin' && idParam) {
      setTargetGuestId(idParam);
      setView('checkin');
    } else if (params.get('portal') === 'public') {
      setView('public');
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!session.isLoggedIn && view !== 'public' && view !== 'checkin') return;
    
    setIsLoading(true);
    try {
      let fetchedRooms = await api.getRooms();
      if (fetchedRooms.length === 0) {
        if (supabase) {
          for (const r of INITIAL_ROOMS) await api.saveRoom(r);
          fetchedRooms = INITIAL_ROOMS;
        } else {
          fetchedRooms = INITIAL_ROOMS;
        }
      }
      setRooms(fetchedRooms);
      setReservations(await api.getReservations());
      setSpecialPrices(await api.getSpecialPrices());
      setGuests(await api.getGuests());
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session.isLoggedIn, view]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dates = useMemo(() => getDaysArray(startDate, daysCount), [startDate, daysCount]);

  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('haras_session', JSON.stringify(userSession));
    setView('grid');
  };

  const handleLogout = () => {
    const emptySession = { username: '', role: 'user' as any, isLoggedIn: false };
    setSession(emptySession);
    localStorage.removeItem('haras_session');
    setView('grid');
  };

  const [selection, setSelection] = useState<SelectionRange>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectionComplete = useCallback((range: SelectionRange) => {
    if (session.role === 'user') return;
    setSelection(range);
    setEditingReservation(null);
    setIsModalOpen(true);
  }, [session.role]);

  // Use useCallback to correctly define the function and dependency array, fixing the syntax error that caused redeclaration errors.
  const handleEditReservation = useCallback((res: Reservation) => {
    setEditingReservation(res);
    setSelection(null);
    setIsModalOpen(true);
  }, [session.role]);

  const handleSaveReservation = async (data: Partial<Reservation> & { guestEmail?: string, guestPhone?: string }) => {
    let currentGuestId = data.guestId;

    if (!currentGuestId && data.guestEmail && data.guestPhone) {
      const newGuest: Guest = {
        id: Math.random().toString(36).substr(2, 9),
        titular: data.guestName || 'Reserva Directa',
        fullName: data.guestName || 'Nuevo Huésped',
        address: '',
        email: data.guestEmail,
        phone: data.guestPhone,
        paymentStatus: 'pending',
        dniDocs: {},
        vehicle: { brand: '', model: '', plate: '', notes: '' }
      };
      await api.saveGuest(newGuest);
      currentGuestId = newGuest.id;
      setGuests(await api.getGuests());
    }

    const resToSave: Reservation = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      roomId: data.roomId!,
      startDate: data.startDate!,
      endDate: data.endDate!,
      guestName: data.guestName || 'Huésped',
      guestId: currentGuestId,
      amount: data.amount || 0,
      color: data.color || COLORS[0].class,
      notes: data.notes,
    };
    
    const saved = await api.saveReservation(resToSave);
    setReservations(prev => {
      const exists = prev.find(r => r.id === saved.id);
      return exists ? prev.map(r => r.id === saved.id ? saved : r) : [...prev, saved];
    });
    
    setIsModalOpen(false);
    setEditingReservation(null);
    setSelection(null);
  };

  if (view === 'public') {
    return <PublicPortal rooms={rooms} reservations={reservations} specialPrices={specialPrices} onConfirmReservation={handleSaveReservation} onBackToLogin={() => setView('grid')} />;
  }

  if (view === 'checkin' && targetGuestId) {
    return <CheckInPortal guestId={targetGuestId} onComplete={() => {}} />;
  }

  if (!session.isLoggedIn) {
    return <Login onLogin={handleLogin} onGoToPublic={() => setView('public')} />;
  }

  const navItems = [
    { id: 'grid', label: 'Calendario', icon: '📅', roles: ['superadmin', 'admin', 'user'] },
    { id: 'rooms', label: 'Mis Unidades', icon: '🏠', roles: ['superadmin', 'admin', 'user'] },
    { id: 'prices', label: 'Temporadas', icon: '🏷️', roles: ['superadmin', 'admin', 'user'] },
    { id: 'guests', label: 'Huéspedes', icon: '👤', roles: ['superadmin', 'admin', 'user'] },
    { id: 'stats', label: 'Estadísticas', icon: '📊', roles: ['superadmin', 'admin'] },
    { id: 'data', label: 'Sistema', icon: '⚙️', roles: ['superadmin'] }
  ].filter(item => item.roles.includes(session.role));

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5]">
      <div className="booking-blue text-white shadow-md z-30">
        <div className="max-w-[1600px] mx-auto flex items-center h-14 px-6 justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">Haras del <span className="text-[#feba02]">Bosque</span></span>
              <span className="text-[10px] opacity-70 uppercase tracking-widest font-semibold">Panel de Control</span>
            </div>
            <nav className="flex space-x-1 h-full pt-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as AppView)}
                  className={`px-4 h-12 flex items-center space-x-2 text-sm font-medium transition-all border-b-4 rounded-t-sm
                    ${view === item.id ? 'border-[#feba02] bg-white bg-opacity-10 text-white' : 'border-transparent text-white text-opacity-80 hover:bg-white hover:bg-opacity-5'}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold leading-none">{session.username.toUpperCase()}</p>
               <p className="text-[10px] text-white text-opacity-60 uppercase font-bold tracking-tighter">{session.role}</p>
             </div>
             <button onClick={handleLogout} className="text-[10px] uppercase font-bold bg-red-600 bg-opacity-80 hover:bg-opacity-100 px-3 py-1.5 rounded transition-all">Salir</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full flex">
        {view === 'grid' ? (
          <div className="flex flex-1 overflow-hidden">
            <Sidebar rooms={rooms} />
            <div className="flex-1 overflow-auto relative bg-white shadow-sm ml-0.5">
              <ReservationGrid 
                rooms={rooms} dates={dates} reservations={reservations} specialPrices={specialPrices}
                onSelectionComplete={handleSelectionComplete} onEditReservation={handleEditReservation}
                readonly={session.role === 'user'}
              />
            </div>
          </div>
        ) : view === 'rooms' ? (
          <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
            <RoomManager rooms={rooms} onSave={async (r) => { await api.saveRoom(r); loadData(); }} onDelete={async (id) => { await api.deleteRoom(id); loadData(); }} readonly={session.role === 'user'} />
          </div>
        ) : view === 'prices' ? (
          <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
            <SpecialPriceManager rooms={rooms} specialPrices={specialPrices} onSave={async (p) => { await api.saveSpecialPrice(p); loadData(); }} onDelete={async (id) => { await api.deleteSpecialPrice(id); loadData(); }} readonly={session.role === 'user'} />
          </div>
        ) : view === 'guests' ? (
          <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
            <GuestManager guests={guests} reservations={reservations} rooms={rooms} onUpdate={loadData} readonly={session.role === 'user'} />
          </div>
        ) : view === 'stats' ? (
          <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
            <StatisticsManager reservations={reservations} rooms={rooms} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
            <DataCenter rooms={rooms} reservations={reservations} onRestore={loadData} />
          </div>
        )}
      </div>

      {isModalOpen && (selection || editingReservation) && (
        <ReservationModal 
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelection(null); setEditingReservation(null); }}
          onSave={handleSaveReservation}
          onDelete={async (id) => { await api.deleteReservation(id); loadData(); setIsModalOpen(false); }}
          initialData={editingReservation ? {
            id: editingReservation.id,
            roomId: editingReservation.roomId,
            startDate: editingReservation.startDate,
            endDate: editingReservation.endDate,
            room: rooms.find(r => r.id === editingReservation.roomId),
            guestName: editingReservation.guestName,
            guestId: editingReservation.guestId,
            amount: editingReservation.amount,
            notes: editingReservation.notes,
            color: editingReservation.color
          } : {
            roomId: selection!.roomId,
            startDate: selection!.startDate,
            endDate: selection!.endDate,
            room: rooms.find(r => r.id === selection!.roomId)
          }}
          specialPrices={specialPrices}
          guests={guests}
          readonly={session.role === 'user'}
        />
      )}
      
      <div className="h-8 bg-white border-t border-gray-200 text-gray-500 text-[11px] flex items-center px-6 justify-between no-select">
        <div className="flex space-x-4">
          <span className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${supabase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            {supabase ? 'Supabase Conectado' : 'Modo Local'}
          </span>
          <span className="text-gray-400">Dic 2025 - Dic {lastYearInCalendar}</span>
        </div>
        <div className="font-semibold text-[#003580]">Haras del Bosque v5.7</div>
      </div>
    </div>
  );
};

export default App;
