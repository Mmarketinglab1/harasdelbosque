
import React, { useState, useEffect } from 'react';
import { Reservation, SpecialPrice, Guest, Room } from '../types';
import { COLORS } from '../constants';
import { getNightsInRange, touchesHighSeason, getNightsCount } from '../utils/dateUtils';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Reservation>) => void;
  onDelete?: (id: string) => void;
  initialData: {
    id?: string;
    roomId: string;
    startDate: string;
    endDate: string;
    room?: Room;
    guestName?: string;
    guestId?: string;
    amount?: number;
    notes?: string;
    color?: string;
  };
  specialPrices: SpecialPrice[];
  guests: Guest[];
  readonly?: boolean;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialData, 
  specialPrices,
  guests,
  readonly = false
}) => {
  const [guestName, setGuestName] = useState(initialData.guestName || '');
  const [guestId, setGuestId] = useState(initialData.guestId || '');
  const [amount, setAmount] = useState<number>(initialData.amount || 0);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [selectedColor, setSelectedColor] = useState(initialData.color || COLORS[0].class);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  useEffect(() => {
    if (isOpen && !initialData.id && initialData.room) {
      const room = initialData.room;
      const nights = getNightsInRange(initialData.startDate, initialData.endDate);
      let total = 0;

      nights.forEach(dateStr => {
        const dateObj = new Date(dateStr.replace(/-/g, '/'));
        const month = dateObj.getMonth(); // 0 = Enero, 1 = Febrero
        const dayOfWeek = dateObj.getDay();

        // 1. PRIORIDAD MÁXIMA: Regla Específica de Tarifa Especial (Admin Manual)
        const specificRule = specialPrices.find(sp => 
          sp.roomId === initialData.roomId && 
          dateStr >= sp.startDate && 
          dateStr <= sp.endDate
        );

        if (specificRule) {
          total += Number(specificRule.price);
          return;
        }

        // 2. PRIORIDAD TEMPORADA ALTA (ENERO/FEBRERO)
        // Ignora fines de semana y tipos de precio seleccionados.
        // El precio cargado es por 7 noches, por lo tanto por noche es Price / 7.
        if (month === 0) { // Enero
          total += Number(room.januaryPrice) / 7;
          return;
        }
        if (month === 1) { // Febrero
          total += Number(room.februaryPrice) / 7;
          return;
        }

        // 3. Regla Global de Temporada (Admin Manual)
        const globalRule = specialPrices.find(sp => 
          sp.roomId === 'all' && 
          dateStr >= sp.startDate && 
          dateStr <= sp.endDate
        );
        
        if (globalRule) {
          total += Number(globalRule.price);
          return;
        }

        // 4. FINES DE SEMANA (Solo fuera de temporada alta)
        const isWeekendDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
        if (isWeekendDay && Number(room.weekendPrice || 0) > 0) {
          total += Number(room.weekendPrice);
          return;
        }

        // 5. TARIFA BASE SELECCIONADA (Solo fuera de temporada alta y fines de semana)
        let dailyRate = Number(room.basePrice);
        if (room.selectedPriceType === 'january') dailyRate = Number(room.januaryPrice) / 7;
        else if (room.selectedPriceType === 'february') dailyRate = Number(room.februaryPrice) / 7;
        else if (room.selectedPriceType === 'promo') dailyRate = Number(room.promoPrice);

        total += dailyRate;
      });

      setAmount(Math.round(total));
    }
  }, [isOpen, initialData, specialPrices]);

  const filteredGuests = guests.filter(g => 
    g.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectGuest = (guest: Guest) => {
    setGuestName(guest.fullName);
    setGuestId(guest.id);
    setShowGuestPicker(false);
    setSearchTerm('');
  };

  const handleSaveAttempt = () => {
    if (touchesHighSeason(initialData.startDate, initialData.endDate)) {
      const nightsCount = getNightsCount(initialData.startDate, initialData.endDate);
      if (nightsCount < 7) {
        alert('RESTRICCIÓN DE TEMPORADA: En Enero y Febrero la estadía mínima es de 7 noches.');
        return;
      }
    }

    onSave({ 
      id: initialData.id,
      guestName, 
      guestId,
      amount, 
      notes, 
      color: selectedColor,
      roomId: initialData.roomId,
      startDate: initialData.startDate,
      endDate: initialData.endDate
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
        <div className="bg-[#003580] text-white px-8 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black">{initialData.id ? 'Ficha de Reserva' : 'Nueva Reserva'}</h2>
            <p className="text-[10px] text-white text-opacity-70 uppercase tracking-widest font-black">Haras del Bosque Express</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all text-2xl">&times;</button>
        </div>
        
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-[#ebf3ff] p-5 rounded-[2rem] border border-blue-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-[#003580] font-black uppercase block tracking-widest opacity-60">Estadía</span>
              <div className="text-sm font-black text-gray-700 flex items-center">
                <span>{initialData.startDate}</span>
                <span className="mx-2 text-blue-300">➜</span>
                <span>{initialData.endDate}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#003580] font-black uppercase block tracking-widest opacity-60">Noches</span>
              <span className="text-2xl font-black text-[#003580]">{getNightsCount(initialData.startDate, initialData.endDate)}</span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2 relative">
              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Titular de la Reserva</label>
              <div className="flex space-x-2">
                <input type="text" className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003580] font-bold text-gray-700" placeholder="Nombre completo" value={guestName} onChange={e => {setGuestName(e.target.value); setGuestId('');}} disabled={readonly} />
                {!readonly && (
                  <button type="button" onClick={() => setShowGuestPicker(!showGuestPicker)} className={`px-6 rounded-2xl border transition-all font-black text-[10px] uppercase ${guestId ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    {guestId ? '✓ Vinculado' : 'Vincular'}
                  </button>
                )}
              </div>

              {showGuestPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 p-4 animate-fade-in max-h-60 overflow-y-auto">
                  <input type="text" placeholder="Buscar..." className="w-full border-b border-gray-50 p-3 mb-3 text-sm outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <div className="space-y-1">
                    {filteredGuests.map(g => (
                      <button key={g.id} onClick={() => handleSelectGuest(g)} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl text-sm transition-colors flex justify-between items-center">
                        <span className="font-bold text-gray-700">{g.fullName}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-black">{g.titular}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Importe Total del Alojamiento</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl">$</span>
                <input type="number" className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-5 rounded-[2rem] outline-none font-black text-[#003580] text-3xl" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} disabled={readonly} />
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2 mt-1">
                {touchesHighSeason(initialData.startDate, initialData.endDate) ? "Tarifas de temporada aplicadas (Prorrateo 7 noches)" : "Cálculo basado en tarifario maestro"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 block">Estado de Cobro</label>
              <div className="grid grid-cols-1 gap-2">
                {COLORS.map(color => (
                  <button key={color.class} type="button" onClick={() => setSelectedColor(color.class)} disabled={readonly} className={`flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all ${selectedColor === color.class ? 'border-[#003580] bg-blue-50/50' : 'border-gray-50 bg-gray-50/50 opacity-40 hover:opacity-100'}`}>
                    <div className={`w-6 h-6 rounded-lg ${color.class} shadow-sm border border-black/10`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${selectedColor === color.class ? 'text-[#003580]' : 'text-gray-400'}`}>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-6 flex justify-between items-center border-t border-gray-100">
          <div>
            {initialData.id && !readonly && (
              <button onClick={() => onDelete?.(initialData.id!)} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Eliminar Registro</button>
            )}
          </div>
          <div className="flex space-x-4">
            <button onClick={onClose} className="px-6 py-3 text-sm text-gray-400 font-bold hover:text-gray-600 transition-all uppercase">Cerrar</button>
            {!readonly && (
              <button onClick={handleSaveAttempt} className="px-10 py-4 bg-[#003580] text-white rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-95 transition-all font-black text-xs uppercase tracking-widest">Guardar Reserva</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
