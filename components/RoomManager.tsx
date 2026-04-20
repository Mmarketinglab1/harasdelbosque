
import React, { useState } from 'react';
import { Room, PriceType } from '../types';

interface RoomManagerProps {
  rooms: Room[];
  onSave: (room: Room) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

const RoomManager: React.FC<RoomManagerProps> = ({ rooms, onSave, onDelete, readonly = false }) => {
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);

  const handleEdit = (room: Room) => {
    if (readonly) return;
    setEditingRoom(room);
  };

  const handleAddNew = () => {
    if (readonly) return;
    setEditingRoom({
      id: Math.random().toString(36).substr(2, 9),
      category: '',
      number: '',
      description: '',
      capacity: '',
      colorClass: 'bg-blue-100',
      basePrice: 0,
      januaryPrice: 0,
      februaryPrice: 0,
      promoPrice: 0,
      weekendPrice: 0,
      selectedPriceType: 'standard',
      videoUrl: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom && !readonly) {
      onSave(editingRoom as Room);
      setEditingRoom(null);
    }
  };

  const getPriceLabel = (type: PriceType) => {
    switch(type) {
      case 'standard': return 'Estándar';
      case 'january': return 'Enero x 7';
      case 'february': return 'Febrero x 7';
      case 'promo': return 'Promo';
      default: return '';
    }
  };

  return (
    <div className="p-10 h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003580] tracking-tight">Gestión de Unidades</h1>
            <p className="text-gray-500 mt-1 font-medium">Configura características y verifica el tarifario maestro de 5 puntos.</p>
          </div>
          {!readonly && (
            <button 
                onClick={handleAddNew}
                className="bg-[#003580] text-white px-8 py-3 rounded-xl shadow-lg hover:brightness-110 transition-all font-bold flex items-center space-x-2"
            >
                <span className="text-xl">+</span> <span>Nueva Unidad</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-5 font-bold text-[#003580] text-[10px] uppercase tracking-widest">Unidad</th>
                <th className="px-6 py-5 font-bold text-[#003580] text-[10px] uppercase tracking-widest">Características</th>
                <th className="px-6 py-5 font-bold text-[#003580] text-[10px] uppercase tracking-widest text-center">Tarifario Maestro (Verificación)</th>
                {!readonly && <th className="px-6 py-5 font-bold text-[#003580] text-[10px] uppercase tracking-widest text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">Aún no has cargado ninguna unidad al sistema.</td>
                </tr>
              ) : (
                rooms.map(room => (
                  <tr key={room.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#ebf3ff] text-[#003580] flex items-center justify-center font-black text-xl border border-blue-100">
                          {room.number}
                        </div>
                        <div>
                          <span className="px-2 py-0.5 bg-blue-100 text-[#003580] text-[9px] font-black rounded uppercase tracking-tighter">
                            {room.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-sm font-bold text-gray-800">{room.description}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{room.capacity}</div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-center space-x-2">
                        {/* 5 Puntos de Precio */}
                        <div className={`p-2 rounded-xl border text-center min-w-[80px] ${room.selectedPriceType === 'standard' ? 'bg-[#003580] border-[#003580] text-white' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[8px] font-black uppercase opacity-60">Noche</p>
                          <p className="text-xs font-bold">${room.basePrice.toLocaleString()}</p>
                        </div>
                        <div className={`p-2 rounded-xl border text-center min-w-[80px] ${room.selectedPriceType === 'promo' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[8px] font-black uppercase opacity-60">Promo</p>
                          <p className="text-xs font-bold">${room.promoPrice.toLocaleString()}</p>
                        </div>
                        <div className={`p-2 rounded-xl border text-center min-w-[80px] ${room.selectedPriceType === 'january' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[8px] font-black uppercase opacity-60">Ene x7</p>
                          <p className="text-xs font-bold">${room.januaryPrice.toLocaleString()}</p>
                        </div>
                        <div className={`p-2 rounded-xl border text-center min-w-[80px] ${room.selectedPriceType === 'february' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[8px] font-black uppercase opacity-60">Feb x7</p>
                          <p className="text-xs font-bold">${room.februaryPrice.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-xl border border-blue-200 bg-blue-50 text-[#003580] text-center min-w-[80px]">
                          <p className="text-[8px] font-black uppercase opacity-60">Finde</p>
                          <p className="text-xs font-bold">${(room.weekendPrice || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    {!readonly && (
                        <td className="px-6 py-6 text-right space-x-2">
                            <button onClick={() => handleEdit(room)} className="p-2 bg-gray-100 hover:bg-[#003580] hover:text-white rounded-xl transition-all">✏️</button>
                            <button onClick={() => onDelete(room.id)} className="p-2 bg-gray-100 hover:bg-red-600 hover:text-white rounded-xl transition-all text-gray-400">🗑️</button>
                        </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRoom && !readonly && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-[#003580] text-white p-8 font-bold flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">Ficha de Unidad {editingRoom.number}</h2>
                <p className="text-[10px] opacity-70 uppercase tracking-widest">Configuración Técnica y Tarifaria</p>
              </div>
              <button onClick={() => setEditingRoom(null)} className="text-3xl hover:opacity-50 transition-all">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nº Identificador</label>
                  <input required value={editingRoom.number} onChange={e => setEditingRoom({...editingRoom, number: e.target.value})} placeholder="Ej: 11" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003580] font-bold text-gray-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoría</label>
                  <input required value={editingRoom.category} onChange={e => setEditingRoom({...editingRoom, category: e.target.value})} placeholder="Ej: Marina" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003580] font-bold text-gray-700" />
                </div>
              </div>

              {/* TARIFARIO MAESTRO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Tarifario Maestro (5 Puntos)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Precio Estándar */}
                  <div className={`p-4 rounded-2xl border-2 transition-all flex items-center space-x-3 ${editingRoom.selectedPriceType === 'standard' ? 'bg-blue-50 border-[#003580]' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <input type="radio" checked={editingRoom.selectedPriceType === 'standard'} onChange={() => setEditingRoom({...editingRoom, selectedPriceType: 'standard'})} className="w-4 h-4 accent-[#003580]" />
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Precio x Noche</label>
                      <input type="number" value={editingRoom.basePrice} onChange={e => setEditingRoom({...editingRoom, basePrice: parseFloat(e.target.value) || 0})} className="w-full bg-transparent font-black text-[#003580] outline-none text-lg" />
                    </div>
                  </div>

                  {/* Precio Promo */}
                  <div className={`p-4 rounded-2xl border-2 transition-all flex items-center space-x-3 ${editingRoom.selectedPriceType === 'promo' ? 'bg-orange-50 border-orange-500' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <input type="radio" checked={editingRoom.selectedPriceType === 'promo'} onChange={() => setEditingRoom({...editingRoom, selectedPriceType: 'promo'})} className="w-4 h-4 accent-orange-500" />
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Promocional</label>
                      <input type="number" value={editingRoom.promoPrice} onChange={e => setEditingRoom({...editingRoom, promoPrice: parseFloat(e.target.value) || 0})} className="w-full bg-transparent font-black text-orange-600 outline-none text-lg" />
                    </div>
                  </div>

                  {/* Precio Enero */}
                  <div className={`p-4 rounded-2xl border-2 transition-all flex items-center space-x-3 ${editingRoom.selectedPriceType === 'january' ? 'bg-blue-50 border-blue-700' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <input type="radio" checked={editingRoom.selectedPriceType === 'january'} onChange={() => setEditingRoom({...editingRoom, selectedPriceType: 'january'})} className="w-4 h-4 accent-blue-700" />
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Enero x 7 Noches</label>
                      <input type="number" value={editingRoom.januaryPrice} onChange={e => setEditingRoom({...editingRoom, januaryPrice: parseFloat(e.target.value) || 0})} className="w-full bg-transparent font-black text-blue-800 outline-none text-lg" />
                    </div>
                  </div>

                  {/* Precio Febrero */}
                  <div className={`p-4 rounded-2xl border-2 transition-all flex items-center space-x-3 ${editingRoom.selectedPriceType === 'february' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <input type="radio" checked={editingRoom.selectedPriceType === 'february'} onChange={() => setEditingRoom({...editingRoom, selectedPriceType: 'february'})} className="w-4 h-4 accent-blue-500" />
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Febrero x 7 Noches</label>
                      <input type="number" value={editingRoom.februaryPrice} onChange={e => setEditingRoom({...editingRoom, februaryPrice: parseFloat(e.target.value) || 0})} className="w-full bg-transparent font-black text-blue-600 outline-none text-lg" />
                    </div>
                  </div>

                  {/* Precio Finde */}
                  <div className="p-4 rounded-2xl border-2 border-blue-100 bg-[#ebf3ff] flex items-center space-x-3">
                    <span className="text-xl">📅</span>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Finde (V, S, D)</label>
                      <input type="number" value={editingRoom.weekendPrice} onChange={e => setEditingRoom({...editingRoom, weekendPrice: parseFloat(e.target.value) || 0})} className="w-full bg-transparent font-black text-[#003580] outline-none text-lg" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Multimedia y Extras</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Video (YouTube/Vimeo)</label>
                    <input value={editingRoom.videoUrl || ''} onChange={e => setEditingRoom({...editingRoom, videoUrl: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003580] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Capacidad / Pax</label>
                    <input value={editingRoom.capacity || ''} onChange={e => setEditingRoom({...editingRoom, capacity: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003580] text-sm font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button type="button" onClick={() => setEditingRoom(null)} className="px-8 py-3 text-gray-400 font-bold hover:text-gray-600 transition-all">Cancelar</button>
                <button type="submit" className="px-12 py-3 bg-[#003580] text-white rounded-2xl font-black shadow-xl hover:brightness-110 active:scale-95 transition-all">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManager;
