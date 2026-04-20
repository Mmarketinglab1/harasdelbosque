
import React, { useState, useMemo } from 'react';
import { Reservation, Room } from '../types';
import { getDaysDiff } from '../utils/dateUtils';

interface StatisticsManagerProps {
  reservations: Reservation[];
  rooms: Room[];
}

const StatisticsManager: React.FC<StatisticsManagerProps> = ({ reservations, rooms }) => {
  const [dateRange, setDateRange] = useState({
    start: '2025-12-01',
    end: '2026-12-31'
  });

  // Filtrado de reservas por el rango seleccionado
  const filteredRes = useMemo(() => {
    return reservations.filter(r => {
      return (r.startDate >= dateRange.start && r.startDate <= dateRange.end) ||
             (r.endDate >= dateRange.start && r.endDate <= dateRange.end);
    });
  }, [reservations, dateRange]);

  // Cálculos de KPIs
  const stats = useMemo(() => {
    const totalPesos = filteredRes.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Aparts únicos ocupados
    const occupiedIds = new Set(filteredRes.map(r => r.roomId));
    
    // Promedio de estadía
    const totalDays = filteredRes.reduce((acc, curr) => acc + getDaysDiff(curr.startDate, curr.endDate), 0);
    const avgStay = filteredRes.length > 0 ? (totalDays / filteredRes.length).toFixed(1) : 0;

    // Aparts más reservados (ranking)
    const rankingMap: Record<string, number> = {};
    filteredRes.forEach(r => {
      rankingMap[r.roomId] = (rankingMap[r.roomId] || 0) + 1;
    });

    const ranking = Object.entries(rankingMap)
      .map(([id, count]) => {
        const room = rooms.find(rm => rm.id === id);
        return { 
          number: room?.number || '?', 
          category: room?.category || '',
          count 
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalPesos,
      occupiedCount: occupiedIds.size,
      avgStay,
      ranking: ranking.slice(0, 5) // Top 5
    };
  }, [filteredRes, rooms]);

  return (
    <div className="p-8 h-full overflow-auto bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header y Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003580] tracking-tight">📊 Registro Maestro & Estadísticas</h1>
            <p className="text-gray-400 font-medium text-sm mt-1">Análisis de rendimiento y auditoría de ingresos.</p>
          </div>
          <div className="mt-6 md:mt-0 flex items-center space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase text-gray-400 ml-2">Desde</span>
               <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
                className="bg-transparent font-bold text-sm text-[#003580] outline-none px-2 py-1"
               />
             </div>
             <div className="text-gray-300">➜</div>
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase text-gray-400 ml-2">Hasta</span>
               <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
                className="bg-transparent font-bold text-sm text-[#003580] outline-none px-2 py-1"
               />
             </div>
          </div>
        </div>

        {/* Dash Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Ingresos del Periodo</span>
            <div>
              <span className="text-xs font-bold text-green-600">$</span>
              <span className="text-3xl font-black text-[#003580] tracking-tighter"> {stats.totalPesos.toLocaleString()}</span>
            </div>
            <div className="mt-4 flex items-center text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg w-fit">
              <span>↑ Bruto</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Aparts Ocupados</span>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-black text-[#003580] tracking-tighter">{stats.occupiedCount}</span>
              <span className="text-sm font-bold text-gray-300 mb-1">/ {rooms.length} totales</span>
            </div>
            <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(stats.occupiedCount / rooms.length) * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Promedio de Estadía</span>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-black text-[#003580] tracking-tighter">{stats.avgStay}</span>
              <span className="text-sm font-bold text-gray-300 mb-1">Días</span>
            </div>
            <div className="mt-4 text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded-lg w-fit uppercase">
              Consolidado
            </div>
          </div>

          <div className="bg-[#003580] p-6 rounded-3xl shadow-xl">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 block">Top Aparts</span>
            <div className="space-y-3">
              {stats.ranking.length === 0 ? (
                <div className="text-white/30 text-xs italic">Sin datos en rango</div>
              ) : (
                stats.ranking.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded bg-white/10 text-white text-[9px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-white">Apart {item.number}</span>
                    </div>
                    <span className="text-[10px] font-black text-[#feba02]">{item.count} Res.</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabla Registro Maestro */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Detalle del Registro Maestro</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Auditoría Transaccional Individual</p>
            </div>
            <div className="text-xs font-black text-[#003580] bg-blue-50 px-4 py-2 rounded-xl">
              {filteredRes.length} REGISTROS ENCONTRADOS
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Huésped Titular</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Desde</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hasta</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Noches</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-gray-300 font-medium italic">No se encontraron registros en el rango de fechas seleccionado.</td>
                  </tr>
                ) : (
                  filteredRes.map(res => {
                    const room = rooms.find(rm => rm.id === res.roomId);
                    const nights = getDaysDiff(res.startDate, res.endDate);
                    return (
                      <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-800">{res.guestName}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{res.id}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-[#ebf3ff] text-[#003580] text-[10px] font-black rounded-lg border border-blue-100 uppercase">
                            Apart {room?.number} — {room?.category}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-mono text-xs text-gray-600">{res.startDate}</td>
                        <td className="px-8 py-5 font-mono text-xs text-gray-600">{res.endDate}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-sm font-black text-gray-700">{nights}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-lg font-black text-[#217346] tracking-tighter">${res.amount.toLocaleString()}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRes.length > 0 && (
                <tfoot className="bg-[#fcfdff] border-t-2 border-gray-100">
                  <tr>
                    <td colSpan={5} className="px-8 py-6 text-right text-xs font-black text-gray-400 uppercase">Total Consolidado en Rango:</td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-2xl font-black text-[#003580] tracking-tighter">${stats.totalPesos.toLocaleString()}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsManager;
