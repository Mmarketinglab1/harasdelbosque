
import React, { useState, useMemo } from 'react';
import { Guest, GuestID, GuestPaymentStatus, Reservation, Room } from '../types';
import { api } from '../services/api';
import { emailService } from '../services/emailService';

interface GuestManagerProps {
  guests: Guest[];
  reservations: Reservation[];
  rooms: Room[];
  onUpdate: () => void;
  readonly?: boolean;
}

const GuestManager: React.FC<GuestManagerProps> = ({ guests, reservations, rooms, onUpdate, readonly = false }) => {
  const [editingGuest, setEditingGuest] = useState<Partial<Guest> | null>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para búsqueda y filtrado
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');

  // Lógica de filtrado combinada
  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      const matchesSearch = 
        guest.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.phone.includes(searchQuery) ||
        (guest.titular && guest.titular.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = 
        filterStatus === 'all' || 
        (filterStatus === 'paid' && guest.paymentStatus === 'paid') ||
        (filterStatus === 'pending' && guest.paymentStatus !== 'paid');

      return matchesSearch && matchesFilter;
    });
  }, [guests, searchQuery, filterStatus]);

  // Estadísticas para los filtros
  const stats = useMemo(() => ({
    total: guests.length,
    paid: guests.filter(g => g.paymentStatus === 'paid').length,
    pending: guests.filter(g => g.paymentStatus !== 'paid').length
  }), [guests]);

  // Función para encontrar la reserva de un huésped
  const getGuestReservation = (guestId: string) => {
    const res = reservations.find(r => r.guestId === guestId);
    if (!res) return null;
    const room = rooms.find(rm => rm.id === res.roomId);
    return { ...res, room };
  };

  const handleAddNew = () => {
    if (readonly) return;
    setIsReadOnlyView(false);
    setEditingGuest({
      id: Math.random().toString(36).substr(2, 9),
      titular: '',
      fullName: '',
      address: '',
      email: '',
      phone: '',
      paymentStatus: 'pending',
      dniDocs: {},
      vehicle: { brand: '', model: '', plate: '', notes: '' }
    });
  };

  const handleOpenEdit = (guest: Guest) => {
    setIsReadOnlyView(false);
    setEditingGuest(guest);
  };

  const handleOpenView = (guest: Guest) => {
    setIsReadOnlyView(true);
    setEditingGuest(guest);
  };

  const handleCompanionNameChange = (guestIndex: number, name: string) => {
    if (isReadOnlyView || !editingGuest) return;
    const guestKey = `guest${guestIndex}` as keyof Guest['dniDocs'];
    
    setEditingGuest(prev => {
      if (!prev) return null;
      const currentDocs = { ...(prev.dniDocs || {}) };
      if (!currentDocs[guestKey]) currentDocs[guestKey] = {};
      (currentDocs[guestKey] as any).name = name;
      return { ...prev, dniDocs: currentDocs };
    });
  };

  const handleTitularDniChange = async (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnlyView) return;
    const file = e.target.files?.[0];
    if (!file || !editingGuest || readonly) return;
    
    if (file.size > 1024 * 1024) {
      alert("La imagen es muy pesada. Máximo 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setEditingGuest(prev => {
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
    if (isReadOnlyView) return;
    const file = e.target.files?.[0];
    if (!file || !editingGuest || readonly) return;
    
    if (file.size > 1024 * 1024) {
      alert("La imagen es muy pesada. Máximo 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const guestKey = `guest${guestIndex}` as keyof Guest['dniDocs'];
      setEditingGuest(prev => {
        if (!prev) return null;
        const currentDocs = { ...(prev.dniDocs || {}) };
        if (!currentDocs[guestKey]) currentDocs[guestKey] = {};
        (currentDocs[guestKey] as any)[side] = base64;
        return { ...prev, dniDocs: currentDocs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyView) return;
    if (editingGuest && !readonly) {
      setIsSaving(true);
      try {
        await api.saveGuest(editingGuest as Guest);
        onUpdate();
        setEditingGuest(null);
      } catch (err: any) {
        console.error("Error capturado en UI:", err);
        alert(`FALLO DE SINCRONIZACIÓN:\n${err.message}\n\nLos datos se han guardado LOCALMENTE.`);
        onUpdate();
        setEditingGuest(null);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (readonly || isSaving || isReadOnlyView) return;
    
    const guestName = name || 'este huésped';
    const confirmMessage = `⚠️ ¿ELIMINAR PERMANENTEMENTE?\n\nEstás a punto de borrar la ficha de: "${guestName.toUpperCase()}".\n\nEsta acción eliminará todos sus datos y fotos del sistema de forma irreversible.`;

    if (window.confirm(confirmMessage)) {
      setIsSaving(true);
      try {
        await api.deleteGuest(id);
        if (editingGuest && editingGuest.id === id) {
          setEditingGuest(null);
        }
        onUpdate();
      } catch (err: any) {
        console.error("Error al borrar:", err);
        alert("ERROR: No se pudo eliminar la ficha. " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const togglePaymentStatus = async (guest: Guest | Partial<Guest>, isInsideModal: boolean = false) => {
    if (readonly || isSaving || (isInsideModal && isReadOnlyView)) return;
    const newStatus: GuestPaymentStatus = guest.paymentStatus === 'paid' ? 'pending' : 'paid';
    
    if (isInsideModal) {
      setEditingGuest({ ...guest, paymentStatus: newStatus });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Guardar primero el estado en la base de datos
      const updatedGuest = { ...guest, paymentStatus: newStatus } as Guest;
      await api.saveGuest(updatedGuest);
      
      // 2. Si el nuevo estado es PAGADO, intentar enviar el email
      if (newStatus === 'paid') {
        if (updatedGuest.email && updatedGuest.email.includes('@')) {
          const checkinUrl = `${window.location.origin}/?view=checkin&id=${updatedGuest.id}`;
          
          console.log("Activando secuencia de envío de email de pago para:", updatedGuest.fullName);
          
          const emailRes = await emailService.sendPaymentConfirmation({
            guest_name: updatedGuest.fullName || 'Huésped',
            guest_email: updatedGuest.email,
            checkin_url: checkinUrl
          });

          if (emailRes.success) {
            alert(`✅ ¡PAGO REGISTRADO!\n\nSe envió automáticamente el email de Check-in a: ${updatedGuest.email}`);
          } else {
            alert(`⚠️ PAGO REGISTRADO, PERO EL EMAIL FALLÓ\n\nError: ${emailRes.error}\n\nVerifica tu cuota de EmailJS o la configuración de la plantilla.`);
          }
        } else {
          alert("Estado cambiado a PAGADO.\n\nNo se pudo enviar el email porque la dirección de correo es inexistente o inválida.");
        }
      } else {
        alert("Estado cambiado a PENDIENTE.");
      }
      
      onUpdate();
    } catch (err: any) {
      console.error("Error al togglear pago:", err);
      alert("Error al actualizar el estado: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 h-full overflow-auto bg-gray-50 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003580] tracking-tight">👤 Fichas de Huéspedes</h1>
            <p className="text-gray-500 mt-1 font-medium">Gestiona datos de contacto, pagos y documentación familiar.</p>
          </div>
          {!readonly && (
            <button onClick={handleAddNew} className="bg-[#003580] text-white px-8 py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all font-bold flex items-center space-x-2">
              <span>+</span> <span>Nueva Ficha</span>
            </button>
          )}
        </div>

        {/* BARRA DE HERRAMIENTAS: Búsqueda y Filtros */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o teléfono..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 p-3 pl-12 rounded-xl text-sm font-medium focus:bg-white focus:border-[#003580] outline-none transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center space-x-2 ${filterStatus === 'all' ? 'bg-[#003580] border-[#003580] text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>
              <span>Todos</span> <span className="bg-white/20 px-1.5 rounded">{stats.total}</span>
            </button>
            <button onClick={() => setFilterStatus('paid')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center space-x-2 ${filterStatus === 'paid' ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-green-100'}`}>
              <span>Pagados</span> <span className="bg-white/20 px-1.5 rounded">{stats.paid}</span>
            </button>
            <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center space-x-2 ${filterStatus === 'pending' ? 'bg-orange-50 border-orange-500 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-100'}`}>
              <span>Pendientes</span> <span className="bg-white/20 px-1.5 rounded">{stats.pending}</span>
            </button>
          </div>
        </div>

        {/* Grid de Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <h3 className="text-xl font-bold text-gray-400">No se encontraron resultados</h3>
            </div>
          ) : (
            filteredGuests.map(guest => {
              const resInfo = getGuestReservation(guest.id);
              return (
                <div key={guest.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all animate-fade-in flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#ebf3ff] text-[#003580] flex items-center justify-center font-black text-2xl border border-blue-50">
                        {guest.fullName.charAt(0)}
                      </div>
                      <div className="flex space-x-1">
                        {/* BOTÓN VER DATOS DE ESTADÍA */}
                        <button 
                          onClick={() => handleOpenView(guest)} 
                          title="Ver datos de la estadía"
                          className="p-2.5 bg-[#ebf3ff] text-[#003580] hover:bg-[#003580] hover:text-white rounded-xl transition-all shadow-sm"
                        >
                          👁️
                        </button>
                        
                        {!readonly && (
                          <>
                            <button onClick={() => handleOpenEdit(guest)} title="Editar ficha" className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#003580] rounded-xl transition-all">✏️</button>
                            <button 
                              onClick={() => handleDelete(guest.id, guest.fullName)} 
                              disabled={isSaving}
                              title="Eliminar permanentemente"
                              className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 rounded-xl transition-all disabled:opacity-30"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 truncate mb-1">{guest.fullName}</h3>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      {resInfo ? (
                        <div className="flex items-center space-x-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                          <span className="text-sm">🏠</span>
                          <span className="text-[10px] font-black text-[#003580] uppercase tracking-tighter">Apart {resInfo.room?.number}</span>
                        </div>
                      ) : (
                        <div className="text-[9px] font-bold text-gray-300 uppercase italic">Sin reserva vinculada</div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mb-6">
                      <span className="text-[10px] font-black text-[#003580] opacity-40 uppercase tracking-widest">Titular:</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{guest.titular || 'No especificado'}</span>
                    </div>

                    <button onClick={() => togglePaymentStatus(guest)} disabled={readonly || isSaving} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between mb-6 ${guest.paymentStatus === 'paid' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{guest.paymentStatus === 'paid' ? '✅' : '⏳'}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest mb-1">{guest.paymentStatus === 'paid' ? 'Pago Realizado' : 'Pendiente'}</span>
                          <span className="text-[9px] opacity-60 font-bold uppercase">Cambiar estado</span>
                        </div>
                      </div>
                      {isSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                    </button>
                    
                    <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
                      <div className="flex items-center space-x-3 text-sm text-gray-600 truncate">
                        <span>📞</span> <span className="font-semibold">{guest.phone}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-600 truncate">
                        <span>📧</span> <span className="font-semibold text-[12px]">{guest.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Edición/Visualización (Ficha Detallada) */}
      {editingGuest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-6 flex justify-between items-center text-white ${isReadOnlyView ? 'bg-blue-600' : 'bg-[#003580]'}`}>
              <div>
                <h2 className="text-2xl font-bold">{isReadOnlyView ? 'Consulta de Estadía' : 'Ficha de Huésped'}</h2>
                <p className="text-xs opacity-70 font-bold uppercase tracking-widest">{isReadOnlyView ? 'Modo Solo Lectura' : 'Información detallada y documentación'}</p>
              </div>
              <button onClick={() => setEditingGuest(null)} className="text-3xl hover:opacity-50 transition-all">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-auto flex-1 p-8">
              <div className="space-y-8">
                
                {/* INFO DE RESERVA Y APART */}
                {editingGuest.id && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Información de Estadía</h3>
                    {(() => {
                      const res = getGuestReservation(editingGuest.id!);
                      if (!res) return (
                        <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase">Sin estadía programada actualmente</p>
                        </div>
                      );
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-5 rounded-2xl shadow-lg flex items-center justify-between text-white ${isReadOnlyView ? 'bg-blue-700' : 'bg-blue-600'}`}>
                            <div>
                              <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Unidad Asignada</p>
                              <h4 className="text-3xl font-black tracking-tighter">Apart {res.room?.number}</h4>
                              <p className="text-xs font-bold uppercase opacity-80">{res.room?.category} — {res.room?.capacity}</p>
                            </div>
                            <div className="text-4xl">🏠</div>
                          </div>
                          <div className="bg-[#ebf3ff] p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-[#003580] uppercase opacity-70 tracking-widest mb-1">Rango de Fechas</p>
                              <div className="flex items-center space-x-2">
                                <span className="font-black text-gray-700">{res.startDate}</span>
                                <span className="text-blue-400">➔</span>
                                <span className="font-black text-gray-700">{res.endDate}</span>
                              </div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase mt-2">Total abonado: ${res.amount.toLocaleString()}</p>
                            </div>
                            {res.room?.videoUrl && (
                                <a href={res.room.videoUrl} target="_blank" rel="noreferrer" className="bg-white p-3 rounded-xl shadow-sm hover:scale-105 transition-all text-xl">🎬</a>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ESTADO DE PAGO */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Estado Administrativo</h3>
                  <div className="flex items-center space-x-4">
                    <button 
                      type="button"
                      disabled={isReadOnlyView}
                      onClick={() => togglePaymentStatus(editingGuest, true)}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${editingGuest.paymentStatus === 'paid' ? 'bg-green-50 border-green-600 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'} ${isReadOnlyView ? 'opacity-80 cursor-default' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{editingGuest.paymentStatus === 'paid' ? '✅' : '⏳'}</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black uppercase tracking-widest mb-1">{editingGuest.paymentStatus === 'paid' ? 'Confirmado: Pagado' : 'Estado: Pendiente'}</span>
                          <span className="text-[9px] opacity-60 font-bold uppercase">{isReadOnlyView ? 'Información de pago' : 'Pulsa para cambiar'}</span>
                        </div>
                      </div>
                      <div className="w-10 h-6 bg-white/50 rounded-full relative flex items-center px-1">
                        <div className={`w-4 h-4 rounded-full transition-all ${editingGuest.paymentStatus === 'paid' ? 'bg-green-600 ml-4' : 'bg-orange-500 ml-0'}`}></div>
                      </div>
                    </button>
                    {!isReadOnlyView && (
                      <div className="hidden md:block w-1/3 text-[9px] text-gray-400 font-bold leading-relaxed uppercase">
                        Al marcar como pagado, el sistema habilita el portal de check-in para que el huésped cargue sus documentos.
                      </div>
                    )}
                  </div>
                </div>

                {/* DATOS PERSONALES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Datos del Titular y Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nombre Completo (Titular)</label>
                      <input disabled={isReadOnlyView} required value={editingGuest.fullName || ''} onChange={e => setEditingGuest({...editingGuest, fullName: e.target.value})} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Titular de Reserva (Referencia)</label>
                      <input disabled={isReadOnlyView} value={editingGuest.titular || ''} onChange={e => setEditingGuest({...editingGuest, titular: e.target.value})} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email</label>
                      <input disabled={isReadOnlyView} type="email" value={editingGuest.email || ''} onChange={e => setEditingGuest({...editingGuest, email: e.target.value})} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Teléfono</label>
                      <input disabled={isReadOnlyView} value={editingGuest.phone || ''} onChange={e => setEditingGuest({...editingGuest, phone: e.target.value})} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* DNI DEL TITULAR */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Documentación del Titular</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-3">DNI Frente (Titular)</h4>
                      <div className={`relative h-32 bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden ${isReadOnlyView ? '' : 'cursor-pointer group'}`}>
                        {editingGuest.dniDocs?.titular?.front ? (
                          <img src={editingGuest.dniDocs.titular.front} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl group-hover:scale-110 transition-transform">📸</div>
                        )}
                        {!isReadOnlyView && <input type="file" accept="image/*" onChange={e => handleTitularDniChange('front', e)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-3">DNI Dorso (Titular)</h4>
                      <div className={`relative h-32 bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden ${isReadOnlyView ? '' : 'cursor-pointer group'}`}>
                        {editingGuest.dniDocs?.titular?.back ? (
                          <img src={editingGuest.dniDocs.titular.back} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl group-hover:scale-110 transition-transform">📸</div>
                        )}
                        {!isReadOnlyView && <input type="file" accept="image/*" onChange={e => handleTitularDniChange('back', e)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DATOS DEL VEHÍCULO */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Datos del Vehículo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Marca</label>
                      <input 
                        disabled={isReadOnlyView}
                        value={editingGuest.vehicle?.brand || ''} 
                        onChange={e => setEditingGuest({...editingGuest, vehicle: { ...(editingGuest.vehicle || {brand:'',model:'',plate:'',notes:''}), brand: e.target.value }})} 
                        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} 
                        placeholder="Ej: Toyota" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Modelo</label>
                      <input 
                        disabled={isReadOnlyView}
                        value={editingGuest.vehicle?.model || ''} 
                        onChange={e => setEditingGuest({...editingGuest, vehicle: { ...(editingGuest.vehicle || {brand:'',model:'',plate:'',notes:''}), model: e.target.value }})} 
                        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} 
                        placeholder="Ej: Hilux" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Patente</label>
                      <input 
                        disabled={isReadOnlyView}
                        value={editingGuest.vehicle?.plate || ''} 
                        onChange={e => setEditingGuest({...editingGuest, vehicle: { ...(editingGuest.vehicle || {brand:'',model:'',plate:'',notes:''}), plate: e.target.value }})} 
                        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} 
                        placeholder="Ej: ABC 123" 
                      />
                    </div>
                  </div>
                </div>

                {/* DOCUMENTACIÓN ACOMPAÑANTES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#003580] uppercase tracking-widest border-b pb-2">Documentación (Acompañantes)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[2, 3, 4, 5, 6].map(idx => {
                      const guestKey = `guest${idx}` as keyof Guest['dniDocs'];
                      const docs = editingGuest.dniDocs?.[guestKey];
                      return (
                        <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                          <h4 className="text-[11px] font-bold text-gray-500 uppercase">Huésped {idx}</h4>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nombre Completo</label>
                            <input 
                              disabled={isReadOnlyView}
                              value={(docs as any)?.name || ''} 
                              onChange={e => handleCompanionNameChange(idx, e.target.value)}
                              className={`w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#003580] ${isReadOnlyView ? 'font-bold text-gray-800' : ''}`} 
                              placeholder="Nombre"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase text-center">Frente</label>
                              <div className={`relative h-24 bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden ${isReadOnlyView ? '' : 'cursor-pointer group'}`}>
                                {(docs as any)?.front ? <img src={(docs as any).front} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl group-hover:scale-110 transition-transform">📸</div>}
                                {!isReadOnlyView && <input type="file" accept="image/*" onChange={e => handleFileChange(idx, 'front', e)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase text-center">Dorso</label>
                              <div className={`relative h-24 bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden ${isReadOnlyView ? '' : 'cursor-pointer group'}`}>
                                {(docs as any)?.back ? <img src={(docs as any).back} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl group-hover:scale-110 transition-transform">📸</div>}
                                {!isReadOnlyView && <input type="file" accept="image/*" onChange={e => handleFileChange(idx, 'back', e)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>

            <div className="p-8 bg-gray-50 border-t flex justify-between items-center">
              <div className="group">
                {(!isReadOnlyView && editingGuest.id) && (
                  <button 
                    type="button" 
                    onClick={() => handleDelete(editingGuest.id!, editingGuest.fullName)} 
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-50 border-2 border-red-100 text-red-600 rounded-xl font-black text-xs uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                  >
                    <span className="text-lg">🚨</span>
                    <span>Eliminar Ficha Permanentemente</span>
                  </button>
                )}
                {(!isReadOnlyView && editingGuest.id) && (
                  <p className="text-[9px] text-red-400 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 uppercase tracking-tighter">Esta acción no se puede deshacer ⚠️</p>
                )}
              </div>
              <div className="flex space-x-4">
                <button type="button" onClick={() => setEditingGuest(null)} className="px-8 py-3 text-gray-400 font-bold hover:text-gray-600">{isReadOnlyView ? 'Cerrar Vista' : 'Cancelar'}</button>
                {!isReadOnlyView && (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSaving} 
                    className={`px-12 py-3 bg-[#003580] text-white rounded-2xl font-extrabold shadow-xl hover:brightness-110 active:scale-95 transition-all ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isSaving ? "Guardando..." : "Guardar Ficha"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManager;
