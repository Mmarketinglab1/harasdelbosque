
import React, { useState, useMemo } from 'react';
import { Room, DateCell, Reservation, SelectionRange, SpecialPrice } from '../types';
import { getNightsCount } from '../utils/dateUtils';

interface ReservationGridProps {
  rooms: Room[];
  dates: DateCell[];
  reservations: Reservation[];
  specialPrices: SpecialPrice[];
  onSelectionComplete: (range: SelectionRange) => void;
  onEditReservation: (reservation: Reservation) => void;
  readonly?: boolean;
}

const ReservationGrid: React.FC<ReservationGridProps> = ({ 
  rooms, 
  dates, 
  reservations, 
  specialPrices,
  onSelectionComplete,
  onEditReservation,
  readonly = false
}) => {
  const [dragStart, setDragStart] = useState<{ roomId: string, dateIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const handleMouseDown = (roomId: string, dateIndex: number) => {
    if (readonly) return;
    setDragStart({ roomId, dateIndex });
    setDragEnd(dateIndex);
  };

  const handleMouseEnter = (dateIndex: number) => {
    if (dragStart && !readonly) {
      setDragEnd(dateIndex);
    }
  };

  const handleMouseUp = () => {
    if (dragStart !== null && dragEnd !== null && !readonly) {
      const startIdx = Math.min(dragStart.dateIndex, dragEnd);
      const endIdx = Math.max(dragStart.dateIndex, dragEnd);
      
      onSelectionComplete({
        roomId: dragStart.roomId,
        startDate: dates[startIdx].dateStr,
        endDate: dates[endIdx].dateStr
      });
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const isSelected = (roomId: string, dateIndex: number) => {
    if (!dragStart || dragStart.roomId !== roomId || dragEnd === null) return false;
    const startIdx = Math.min(dragStart.dateIndex, dragEnd);
    const endIdx = Math.max(dragStart.dateIndex, dragEnd);
    return dateIndex >= startIdx && dateIndex <= endIdx;
  };

  const getSpecialPriceForCell = (roomId: string, dateStr: string) => {
    const specific = specialPrices.find(sp => sp.roomId === roomId && dateStr >= sp.startDate && dateStr <= sp.endDate);
    if (specific) return { type: 'specific', price: specific.price };
    const global = specialPrices.find(sp => sp.roomId === 'all' && dateStr >= sp.startDate && dateStr <= sp.endDate);
    if (global) return { type: 'global', price: global.price };
    return null;
  };

  const reservationMap = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    rooms.forEach(r => map[r.id] = []);
    reservations.forEach(res => {
      if (map[res.roomId]) map[res.roomId].push(res);
    });
    return map;
  }, [reservations, rooms]);

  return (
    <div 
      className={`inline-block min-w-full no-select relative bg-white ${readonly ? 'cursor-default' : 'cursor-cell'}`}
      onMouseLeave={() => { if(dragStart) handleMouseUp(); }}
    >
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
        <div className="flex">
          {dates.map((d, i) => (
            <div 
              key={d.dateStr} 
              className={`w-20 flex-shrink-0 border-r border-gray-100 text-center flex flex-col justify-center py-2 h-[75px] transition-colors
                ${d.isWeekend ? 'bg-[#ebf3ff]' : 'bg-white'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${d.isWeekend ? 'text-[#003580]' : 'text-gray-400'}`}>
                {d.dayName.substring(0, 3)}
              </span>
              <span className={`text-sm font-extrabold ${d.isWeekend ? 'text-[#003580]' : 'text-gray-800'}`}>
                {d.dayNumber}
              </span>
              <span className="text-[9px] text-gray-400 font-medium">{d.monthName}</span>
            </div>
          ))}
        </div>
      </div>

      <div onMouseUp={handleMouseUp} className="bg-gray-50">
        {rooms.map((room) => (
          <div key={room.id} className="flex h-12 relative group">
            {dates.map((date, idx) => {
              const selected = isSelected(room.id, idx);
              const reservation = reservationMap[room.id].find(r => r.startDate === date.dateStr);
              const special = getSpecialPriceForCell(room.id, date.dateStr);

              return (
                <div 
                  key={`${room.id}-${date.dateStr}`}
                  onMouseDown={() => handleMouseDown(room.id, idx)}
                  onMouseEnter={() => handleMouseEnter(idx)}
                  className={`w-20 flex-shrink-0 border-r border-b border-gray-100 relative transition-all duration-75
                    ${date.isWeekend ? 'bg-[#fcfdff]' : 'bg-white'}
                    ${special ? 'bg-[#fffbeb]' : ''}
                    ${selected ? 'bg-blue-200 ring-2 ring-[#003580] ring-inset z-20' : 'hover:bg-gray-50'}
                  `}
                >
                  {special && !reservation && <div className="absolute top-1 right-1 text-[8px] opacity-40">🏷️</div>}

                  {reservation && (
                    <div 
                      className={`absolute inset-0 z-30 m-[3px] rounded-md p-2 shadow-md text-white text-[10px] overflow-hidden ${readonly ? 'cursor-default' : 'cursor-pointer hover:brightness-105 active:scale-[0.98]'} transition-all
                        ${reservation.color || 'bg-[#003580]'}
                      `}
                      style={{ 
                        // Una noche = 1 celda (5rem). 
                        // calc(nights * 5rem - 6px de margen)
                        width: `calc(${getNightsCount(reservation.startDate, reservation.endDate) * 5}rem - 6px)`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReservation(reservation);
                      }}
                    >
                      <div className="font-bold truncate drop-shadow-sm flex items-center">
                        <span className="mr-1">👤</span> {reservation.guestName}
                      </div>
                      <div className="truncate opacity-90 text-[9px] flex items-center mt-0.5">
                        <span className="mr-1">💳</span> ${Number(reservation.amount).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReservationGrid;
