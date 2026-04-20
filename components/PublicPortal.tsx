
import React, { useState, useMemo, useRef } from 'react';
import { Room, Reservation, SpecialPrice } from '../types';
import { getNightsInRange, formatDateToISO, touchesHighSeason, getNightsCount } from '../utils/dateUtils';
import { emailService } from '../services/emailService';

interface PublicPortalProps {
  rooms: Room[];
  reservations: Reservation[];
  specialPrices: SpecialPrice[];
  onConfirmReservation: (data: Partial<Reservation> & { guestEmail?: string, guestPhone?: string }) => void;
  onBackToLogin: () => void;
}

const PublicPortal: React.FC<PublicPortalProps> = ({ 
  rooms, 
  reservations, 
  specialPrices, 
  onConfirmReservation,
  onBackToLogin
}) => {
  const [checkIn, setCheckIn] = useState(formatDateToISO(new Date()));
  const [checkOut, setCheckOut] = useState(formatDateToISO(new Date(Date.now() + 86400000)));
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const availableRooms = useMemo(() => {
    if (!checkIn || !checkOut) return [];
    const searchRange = getNightsInRange(checkIn, checkOut);
    
    return rooms.filter(room => {
      const overlapping = reservations.filter(res => {
        if (res.roomId !== room.id) return false;
        // Obtenemos las noches ocupadas de la reserva existente
        const resRange = getNightsInRange(res.startDate, res.endDate);
        return searchRange.some(date => resRange.includes(date));
      });
      return overlapping.length === 0;
    });
  }, [checkIn, checkOut, rooms, reservations]);

  const handleSearch = () => {
    if (checkOut <= checkIn) {
      alert('La fecha de salida debe ser posterior a la de entrada.');
      return;
    }

    if (touchesHighSeason(checkIn, checkOut)) {
      const nightsCount = getNightsCount(checkIn, checkOut);
      if (nightsCount < 7) {
        alert('Temporada Alta (Enero/Febrero): La estadía mínima es de 7 noches.');
        return;
      }
    }

    setIsSearching(true);
    
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 800);
  };

  const calculateTotal = (room: Room) => {
    const nights = getNightsInRange(checkIn, checkOut);
    let total = 0;

    nights.forEach(dateStr => {
      const dateObj = new Date(dateStr.replace(/-/g, '/'));
      const month = dateObj.getMonth();
      const dayOfWeek = dateObj.getDay();

      // 1. Prioridad: Tarifa Especial Manual (Admin)
      const sp = specialPrices.find(s => 
        (s.roomId === room.id || s.roomId === 'all') && 
        dateStr >= s.startDate && dateStr <= s.endDate
      );
      
      if (sp) {
        total += Number(sp.price);
        return;
      }

      // 2. Prioridad: Temporada Alta Forzada (Ignora recargos fines de semana y usa bloques de 7)
      if (month === 0) { // Enero
        total += Number(room.januaryPrice) / 7;
        return;
      }
      if (month === 1) { // Febrero
        total += Number(room.februaryPrice) / 7;
        return;
      }

      // 3. Fines de Semana (Solo fuera de temporada alta)
      const isWeekendDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
      if (isWeekendDay && Number(room.weekendPrice || 0) > 0) {
        total += Number(room.weekendPrice);
        return;
      }

      // 4. Tarifa Base por defecto o seleccionada (Fuera de temporada alta)
      let unitBasePrice = Number(room.basePrice);
      if (room.selectedPriceType === 'january') unitBasePrice = Number(room.januaryPrice) / 7;
      else if (room.selectedPriceType === 'february') unitBasePrice = Number(room.februaryPrice) / 7;
      else if (room.selectedPriceType === 'promo') unitBasePrice = Number(room.promoPrice);

      total += unitBasePrice;
    });

    return Math.round(total);
  };

  const handleBooking = (room: Room) => {
    setSelectedRoom(room);
    setIsConfirming(true);
  };

  const handleFinalConfirm = async () => {
    if (!guestName || !guestEmail || !guestPhone || !selectedRoom) {
      alert('Por favor complete todos los datos de contacto.');
      return;
    }

    setIsProcessing(true);
    const totalAmount = calculateTotal(selectedRoom);
    
    try {
      // 1. Guardar en Base de Datos
      onConfirmReservation({
        roomId: selectedRoom.id,
        startDate: checkIn,
        endDate: checkOut,
        guestName: guestName,
        amount: totalAmount,
        notes: `Reserva Online - Email: ${guestEmail} - Tel: ${guestPhone}`,
        color: 'bg-sky-400',
        guestEmail: guestEmail,
        guestPhone: guestPhone
      });

      // 2. Enviar Correo de Confirmación vía EmailJS
      await emailService.sendReservationConfirmation({
        guest_name: guestName,
        guest_email: guestEmail,
        check_in: checkIn,
        check_out: checkOut,
        room_number: selectedRoom.number,
        total_amount: `$${totalAmount.toLocaleString()}`
      });
      
      alert('¡Reserva confirmada! Se ha enviado un correo con los detalles.');
      onBackToLogin();
    } catch (error) {
      console.error("Error en proceso de reserva:", error);
      alert('La reserva se guardó pero hubo un error enviando el correo.');
      onBackToLogin();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 flex flex-col font-sans relative">
      <header className="bg-[#003580] text-white p-4 shadow-lg sticky top-0 z-50 shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter leading-tight">Haras del <span className="text-[#feba02]">Bosque</span></span>
            <span className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Portal de Reservas Directas</span>
          </div>
          <button onClick={onBackToLogin} className="text-sm font-bold border border-white/30 px-4 py-2 rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2">
            <span>⚙️</span>
            <span className="hidden sm:inline">Área de Gestión</span>
          </button>
        </div>
      </header>

      <div className="flex-1">
        <div className="bg-[#003580] pb-32 pt-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
              <h1 className="text-white text-3xl md:text-4xl font-bold text-center md:text-left">Busca tu próximo descanso</h1>
              <div className="bg-[#feba02]/20 border border-[#feba02]/40 rounded-lg p-2 mt-4 md:mt-0 flex items-center space-x-2">
                <span className="text-lg">📢</span>
                <span className="text-[10px] text-white font-bold uppercase tracking-tight">Enero y Febrero estadía mínima: 7 noches</span>
              </div>
            </div>
            
            <div className="bg-[#feba02] p-1 rounded-xl shadow-2xl">
              <div className="bg-white rounded-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Entrada</label>
                  <input 
                    type="date" 
                    min={formatDateToISO(new Date())}
                    value={checkIn} 
                    onChange={e => {
                      setCheckIn(e.target.value);
                      setHasSearched(false);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-md font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#003580]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Salida</label>
                  <input 
                    type="date" 
                    min={checkIn}
                    value={checkOut} 
                    onChange={e => {
                      setCheckOut(e.target.value);
                      setHasSearched(false);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-md font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#003580]"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className={`w-full bg-[#003580] text-white py-2.5 rounded-md font-bold shadow-lg transition-all flex items-center justify-center space-x-2
                      ${isSearching ? 'opacity-70 cursor-wait' : 'hover:brightness-110 active:scale-[0.98]'}`}
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <span>Ver Disponibilidad</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main ref={resultsRef} className="max-w-4xl mx-auto -mt-20 pb-24 px-4 w-full min-h-[400px]">
          {hasSearched ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-2 px-2">
                <h2 className="text-xl font-bold text-gray-800">
                  {availableRooms.length} {availableRooms.length === 1 ? 'opción disponible' : 'opciones disponibles'}
                </h2>
                <div className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                   {getNightsCount(checkIn, checkOut)} noches ({checkIn} — {checkOut})
                </div>
              </div>

              {availableRooms.length > 0 ? (
                availableRooms.map(room => (
                  <div key={room.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200 flex flex-col md:flex-row hover:shadow-xl transition-shadow duration-300">
                    <div className="w-full md:w-72 h-48 md:h-auto bg-gray-100 relative overflow-hidden group">
                      <div className="absolute top-3 left-3 bg-[#003580] text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-lg z-10">
                        Unidad {room.number}
                      </div>
                      
                      {room.videoUrl && (
                        <div className="absolute bottom-3 right-3 z-10">
                          <a 
                            href={room.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-red-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1 hover:scale-105 transition-all"
                          >
                            <span>▶</span>
                            <span>VER VIDEO</span>
                          </a>
                        </div>
                      )}

                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20 bg-gradient-to-br from-gray-200 to-gray-300 group-hover:scale-110 transition-transform duration-700">
                        🏠
                      </div>
                    </div>
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-2xl font-black text-[#003580] leading-none">{room.category}</h3>
                            <p className="text-sm text-gray-400 font-medium mt-1">Haras del Bosque Resort</p>
                          </div>
                          <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-lg">
                            {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-xs">★</span>)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{room.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full border border-green-100 uppercase tracking-tighter">Reserva Inmediata</span>
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">Capacidad: {room.capacity}</span>
                          <span className="bg-gray-50 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-200 uppercase tracking-tighter">WiFi Premium</span>
                        </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Precio Final ({getNightsCount(checkIn, checkOut)} noches)</p>
                          <p className="text-3xl font-black text-[#003580] tracking-tighter">
                            ${calculateTotal(room).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-green-600 font-bold italic">Impuestos incluidos</p>
                        </div>
                        <button 
                          onClick={() => handleBooking(room)}
                          className="bg-[#003580] text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,53,128,0.2)]"
                        >
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-20 rounded-3xl shadow-inner text-center border-4 border-dashed border-gray-100 animate-fade-in">
                   <span className="text-7xl block mb-6 animate-bounce">🏖️</span>
                   <h3 className="text-2xl font-bold text-gray-800">Sin disponibilidad para estas fechas</h3>
                   <p className="text-gray-400 mt-2 max-w-sm mx-auto">Lo sentimos, todas nuestras unidades están ocupadas en el rango seleccionado. ¡Intenta con otras fechas!</p>
                   <button 
                    onClick={() => {
                      const container = resultsRef.current?.closest('.overflow-y-auto');
                      container?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-6 text-[#003580] font-bold text-sm underline"
                   >
                     Cambiar fechas de búsqueda
                   </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="text-8xl mb-4">🔎</div>
              <p className="text-lg font-bold text-[#003580]">Indica tus fechas arriba para ver unidades disponibles</p>
            </div>
          )}
        </main>
      </div>

      {isConfirming && selectedRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
            <div className="bg-[#003580] text-white p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black">Tu Reserva</h2>
                  <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Unidad {selectedRoom.number} — {selectedRoom.category}</p>
                </div>
                <button onClick={() => setIsConfirming(false)} className="text-3xl leading-none">&times;</button>
              </div>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={guestName} 
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#003580] outline-none font-bold text-gray-700 transition-colors"
                    placeholder="Ej: Marcelo González"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={guestEmail} 
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#003580] outline-none font-bold text-gray-700 transition-colors"
                      placeholder="mail@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Teléfono Móvil</label>
                    <input 
                      type="tel" 
                      value={guestPhone} 
                      onChange={e => setGuestPhone(e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#003580] outline-none font-bold text-gray-700 transition-colors"
                      placeholder="+54 9 ..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#ebf3ff] p-5 rounded-3xl border border-blue-100 space-y-2">
                 <div className="flex justify-between text-[10px] text-[#003580] font-black uppercase tracking-widest">
                   <span>Resumen de estadía</span>
                   <span>{getNightsCount(checkIn, checkOut)} Noches</span>
                 </div>
                 <div className="flex items-center text-sm font-bold text-gray-700">
                   <span className="bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-50">{checkIn}</span>
                   <span className="mx-2 text-blue-300">➜</span>
                   <span className="bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-50">{checkOut}</span>
                 </div>
                 <div className="text-2xl font-black text-[#003580] pt-4 border-t border-blue-200 mt-2 flex justify-between items-end">
                   <span className="text-sm font-bold opacity-60">Total Final:</span>
                   <span>${calculateTotal(selectedRoom).toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex flex-col space-y-4 pt-4">
                <button 
                  onClick={handleFinalConfirm}
                  disabled={!guestName || !guestEmail || !guestPhone || isProcessing}
                  className="w-full bg-[#003580] text-white py-5 rounded-2xl font-black text-lg shadow-[0_15px_30px_rgba(0,53,128,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>PROCESANDO...</span>
                    </>
                  ) : (
                    <span>CONFIRMAR AHORA</span>
                  )}
                </button>
                <button 
                  onClick={() => setIsConfirming(false)}
                  disabled={isProcessing}
                  className="w-full text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Cambiar Habitación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="mt-auto py-10 px-4 border-t border-gray-200 bg-white shrink-0">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Haras del Bosque © 2025 — Pinamar, Argentina</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicPortal;
