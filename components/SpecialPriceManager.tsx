
import React, { useState } from 'react';
import { SpecialPrice, Room } from '../types';

interface SpecialPriceManagerProps {
  rooms: Room[];
  specialPrices: SpecialPrice[];
  onSave: (price: SpecialPrice) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

const SpecialPriceManager: React.FC<SpecialPriceManagerProps> = ({ rooms, specialPrices, onSave, onDelete, readonly = false }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<SpecialPrice>>({
    roomId: 'all',
    startDate: '',
    endDate: '',
    price: 0,
    label: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.startDate && formData.endDate && formData.price && !readonly) {
      onSave({
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      } as SpecialPrice);
      setIsAdding(false);
      setFormData({ roomId: 'all', startDate: '', endDate: '', price: 0, label: '' });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tarifas Especiales y Temporadas</h1>
          <p className="text-sm text-gray-500">Configura importes específicos para fechas especiales.</p>
        </div>
        {!readonly && (
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-[#217346] text-white px-4 py-2 rounded shadow hover:bg-green-800 transition-colors flex items-center"
            >
                <span className="mr-2">+</span> Nueva Tarifa Especial
            </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Unidad</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Desde</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Hasta</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Etiqueta</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Precio / Noche</th>
              {!readonly && <th className="px-4 py-3 font-semibold text-gray-600 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {specialPrices.length === 0 ? (
              <tr>
                <td colSpan={readonly ? 5 : 6} className="px-4 py-10 text-center text-gray-400 italic">No hay tarifas especiales configuradas.</td>
              </tr>
            ) : (
              specialPrices.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(sp => {
                const room = rooms.find(r => r.id === sp.roomId);
                return (
                  <tr key={sp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {sp.roomId === 'all' ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Todas las Unidades</span>
                      ) : (
                        `Unidad ${room?.number || sp.roomId}`
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{sp.startDate}</td>
                    <td className="px-4 py-3 font-mono">{sp.endDate}</td>
                    <td className="px-4 py-3 text-gray-500 italic">{sp.label || '-'}</td>
                    <td className="px-4 py-3 font-bold text-green-700 font-mono">${sp.price.toLocaleString()}</td>
                    {!readonly && (
                        <td className="px-4 py-3 text-right">
                            <button onClick={() => onDelete(sp.id)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                        </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAdding && !readonly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-300">
            <div className="bg-[#217346] text-white p-4 font-bold flex justify-between items-center">
              <span>Configurar Precio Especial</span>
              <button onClick={() => setIsAdding(false)} className="text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">Aplicar a:</label>
                <select 
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  value={formData.roomId}
                  onChange={e => setFormData({...formData, roomId: e.target.value})}
                >
                  <option value="all">Todas las Unidades</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Unidad {r.number} ({r.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Fecha Inicio</label>
                  <input 
                    type="date"
                    required
                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Fecha Fin</label>
                  <input 
                    type="date"
                    required
                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Nombre / Evento</label>
                  <input 
                    type="text"
                    placeholder="Ej: Navidad, Verano"
                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.label}
                    onChange={e => setFormData({...formData, label: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Precio por Noche ($)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Ej: 45000"
                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-mono font-bold"
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-500 text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-[#217346] text-white rounded font-bold shadow-md hover:bg-green-800 transition-colors">Guardar Tarifa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialPriceManager;
