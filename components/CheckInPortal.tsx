
import React, { useState, useEffect } from 'react';
import { Guest, GuestID } from '../types';
import { api } from '../services/api';

interface CheckInPortalProps {
  guestId: string;
  onComplete: () => void;
}

const CheckInPortal: React.FC<CheckInPortalProps> = ({ guestId, onComplete }) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const fetchGuest = async () => {
      try {
        const allGuests = await api.getGuests();
        const found = allGuests.find(g => g.id === guestId);
        if (found) {
          setGuest(found);
        }
      } catch (err) {
        console.error("Error cargando huésped:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuest();
  }, [guestId]);

  const handleCompanionNameChange = (guestIndex: number, name: string) => {
    if (!guest) return;
    const guestKey = `guest${guestIndex}` as keyof Guest['dniDocs'];
    
    setGuest(prev => {
      if (!prev) return null;
      const currentDocs = { ...(prev.dniDocs || {}) };
      if (!currentDocs[guestKey]) currentDocs[guestKey] = {};
      (currentDocs[guestKey] as any).name = name;
      return { ...prev, dniDocs: currentDocs };
    });
  };

  const handleTitularDniChange = async (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guest) return;
    
    if (file.size > 1.5 * 1024 * 1024) {
      alert("La imagen es muy pesada. Máximo 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setGuest(prev => {
        if (!prev) return null;
        const currentDocs = { ...(prev.dniDocs || {}) };
        if (!currentDocs.titular) currentDocs.titular = {};
        currentDocs.titular = { ...currentDocs.titular, [side]: base64 };
        return { ...prev, dniDocs: currentDocs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (guestIndex: number, side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guest) return;
    
    if (file.size > 1.5 * 1024 * 1024) {
      alert("La imagen es muy pesada. Máximo 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const guestKey = `guest${guestIndex}` as keyof Guest['dniDocs'];
      
      setGuest(prev => {
        if (!prev) return null;
        const currentDocs = { ...(prev.dniDocs || {}) };
        if (!currentDocs[guestKey]) currentDocs[guestKey] = {};
        (currentDocs[guestKey] as any)[side] = base64;
        return { ...prev, dniDocs: currentDocs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!guest) return;
    setSaving(true);
    try {
      await api.saveGuest(guest);
      setIsFinished(true);
    } catch (err) {
      alert("Error al guardar los datos. Por favor intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#003580] flex flex-col items-center justify-center text-white p-6 z-[100]">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="font-bold uppercase tracking-widest text-sm text-center">Validando tu acceso...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center p-6 text-center z-[100] animate-fade-in">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border border-green-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
          <h2 className="text-2xl font-black text-gray-800 leading-tight">¡Check-in Completado!</h2>
          <p className="text-gray-500 mt-4 font-medium">Tus datos han sido procesados correctamente.</p>
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-[#003580] font-black text-sm uppercase tracking-tighter">Haras del Bosque</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Te deseamos una excelente estadía</p>
          </div>
          <p className="mt-8 text-[10px] text-gray-300 italic">Ya puedes cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">❌</span>
        <h2 className="text-2xl font-black text-gray-800">Enlace Inválido</h2>
        <p className="text-gray-500 mt-2 max-w-xs">El enlace de check-in ha expirado o no es correcto.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 bg-[#003580] text-white px-8 py-3 rounded-xl font-bold">Volver al Inicio</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 overflow-y-auto">
      <header className="bg-[#003580] text-white p-6 pt-10 text-center rounded-b-[2.5rem] shadow-xl shrink-0">
        <h1 className="text-xl font-black">Check-in Express</h1>
        <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Haras del Bosque Resort</p>
      </header>

      <div className="max-w-xl mx-auto px-4 pb-20">
        <div className="bg-white rounded-[2rem] p-5 sm:p-8 shadow-xl space-y-8 mt-6 border border-gray-100">
          <div className="border-b border-gray-50 pb-5">
            <h2 className="text-lg font-black text-gray-800 leading-tight">¡Hola, {guest.fullName}!</h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Completa los datos del titular y acompañantes para agilizar tu ingreso al predio.</p>
          </div>

          {/* DATOS DEL TITULAR */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-[#003580] uppercase tracking-widest bg-blue-50 w-fit px-3 py-1 rounded-full">Datos del Titular</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nombre y Apellido Titular</label>
                <input 
                  value={guest.fullName || ''} 
                  onChange={e => setGuest({...guest, fullName: e.target.value})}
                  placeholder="Nombre completo"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#003580] font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Teléfono</label>
                <input 
                  value={guest.phone || ''} 
                  onChange={e => setGuest({...guest, phone: e.target.value})}
                  placeholder="+54 9 ..."
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#003580] font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-2">
                 <label className="block text-[8px] font-bold text-gray-400 uppercase text-center">Frente DNI Titular</label>
                 <div className="relative aspect-[4/3] bg-white border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                    {guest.dniDocs?.titular?.front ? (
                      <img src={guest.dniDocs.titular.front} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="text-xl">📸</span>
                        <span className="text-[8px] font-bold text-gray-400 mt-1">Subir Frente</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={e => handleTitularDniChange('front', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="block text-[8px] font-bold text-gray-400 uppercase text-center">Dorso DNI Titular</label>
                 <div className="relative aspect-[4/3] bg-white border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                    {guest.dniDocs?.titular?.back ? (
                      <img src={guest.dniDocs.titular.back} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="text-xl">📸</span>
                        <span className="text-[8px] font-bold text-gray-400 mt-1">Subir Dorso</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={e => handleTitularDniChange('back', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
              </div>
            </div>
          </section>

          {/* VEHICULO */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-[#003580] uppercase tracking-widest bg-blue-50 w-fit px-3 py-1 rounded-full">Datos del Vehículo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Marca / Modelo</label>
                <input 
                  value={guest.vehicle?.brand || ''} 
                  onChange={e => setGuest({...guest, vehicle: { ...(guest.vehicle || {brand:'',model:'',plate:'',notes:''}), brand: e.target.value }})}
                  placeholder="Ej: Toyota Hilux"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#003580] font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Patente</label>
                <input 
                  value={guest.vehicle?.plate || ''} 
                  onChange={e => setGuest({...guest, vehicle: { ...(guest.vehicle || {brand:'',model:'',plate:'',notes:''}), plate: e.target.value }})}
                  placeholder="ABC 123"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#003580] font-bold uppercase text-sm"
                />
              </div>
            </div>
          </section>

          {/* DNI ACOMPAÑANTES */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-[#003580] uppercase tracking-widest bg-blue-50 w-fit px-3 py-1 rounded-full">Documentación Acompañantes</h3>
            <div className="space-y-6">
              {[2, 3, 4, 5, 6].map(idx => {
                const guestKey = `guest${idx}` as keyof Guest['dniDocs'];
                const docs = guest.dniDocs?.[guestKey];
                return (
                  <div key={idx} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 space-y-5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[#003580] text-white flex items-center justify-center text-[10px] font-black">
                        {idx}
                      </div>
                      <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Acompañante {idx}</h4>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nombre y Apellido Huésped {idx}</label>
                      <input 
                        type="text"
                        value={(docs as any)?.name || ''}
                        onChange={e => handleCompanionNameChange(idx, e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#003580] font-bold text-sm shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                         <label className="block text-[8px] font-bold text-gray-400 uppercase text-center">Frente DNI</label>
                         <div className="relative aspect-[4/3] bg-white border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                            {(docs as any)?.front ? (
                              <img src={(docs as any).front} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-xl">📸</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => handleFileChange(idx, 'front', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="block text-[8px] font-bold text-gray-400 uppercase text-center">Dorso DNI</label>
                         <div className="relative aspect-[4/3] bg-white border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                            {(docs as any)?.back ? (
                              <img src={(docs as any).back} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-xl">📸</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => handleFileChange(idx, 'back', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm pb-2">
            <button 
              onClick={handleSave}
              disabled={saving}
              className={`w-full bg-[#003580] text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:brightness-110 active:scale-95 transition-all
                ${saving ? 'opacity-50 cursor-wait' : 'hover:shadow-[0_15px_30px_rgba(0,53,128,0.3)]'}`}
            >
              {saving ? 'GUARDANDO...' : 'FINALIZAR CHECK-IN'}
            </button>
          </div>
          <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-4">Haras del Bosque Resort & Spa</p>
        </div>
      </div>
    </div>
  );
};

export default CheckInPortal;
