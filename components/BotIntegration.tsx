
import React, { useState, useMemo } from 'react';
import { Room, Reservation } from '../types';

interface BotIntegrationProps {
  rooms: Room[];
  reservations: Reservation[];
}

const BotIntegration: React.FC<BotIntegrationProps> = ({ rooms, reservations }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [activeSubTab, setActiveSubTab] = useState<'payload' | 'api'>('payload');

  const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || '';
  const supabaseKey = (window as any).process?.env?.SUPABASE_ANON_KEY || '';

  const botPayload = useMemo(() => {
    return {
      hotel_name: "Haras del Bosque",
      location: "Pinamar, Argentina",
      last_update: new Date().toISOString(),
      rooms: rooms.map(r => ({
        id: r.id,
        number: r.number,
        category: r.category,
        capacity: r.capacity,
        prices: {
          nightly: r.basePrice,
          weekend: r.weekendPrice || r.basePrice * 1.2,
          january_week: r.januaryPrice,
          february_week: r.februaryPrice,
          promo: r.promoPrice
        },
        occupied: reservations
          .filter(res => res.roomId === r.id)
          .map(res => ({ from: res.startDate, to: res.endDate }))
      }))
    };
  }, [rooms, reservations]);

  const jsonString = JSON.stringify(botPayload, null, 2);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const edgeFunctionCode = `
// PEGA ESTO EN SUPABASE EDGE FUNCTIONS PARA UN GET ÚNICO
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data: rooms } = await supabase.from('rooms').select('*')
  const { data: reservations } = await supabase.from('reservations').select('*')

  return new Response(
    JSON.stringify({ rooms, reservations }),
    { headers: { "Content-Type": "application/json" } }
  )
})
  `.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header con Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-gray-100 pb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">🤖</div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">Integración de Bot</h3>
              <div className="flex space-x-4 mt-1">
                <button 
                  onClick={() => setActiveSubTab('payload')}
                  className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeSubTab === 'payload' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Estructura JSON
                </button>
                <button 
                  onClick={() => setActiveSubTab('api')}
                  className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeSubTab === 'api' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Conexión API (GET)
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => handleCopy(activeSubTab === 'payload' ? jsonString : edgeFunctionCode)}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center space-x-2 text-sm ${
              copyStatus === 'copied' ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:brightness-110'
            }`}
          >
            <span>{copyStatus === 'copied' ? '✓ Copiado' : '📋 Copiar Código'}</span>
          </button>
        </div>

        {activeSubTab === 'payload' ? (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
              <h4 className="font-black text-indigo-800 uppercase text-[10px] mb-2">🧠 Cómo usar este Payload:</h4>
              <p className="text-xs text-indigo-800 leading-relaxed italic">
                Copia este JSON y pégalo en el "Knowledge Base" o "Context" de tu IA. Le permitirá saber qué habitaciones están libres y cuánto cuestan según la fecha.
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border-4 border-gray-800">
              <pre className="text-indigo-400 font-mono text-[11px] overflow-auto max-h-[400px] leading-relaxed scrollbar-thin scrollbar-thumb-indigo-900">
                {jsonString}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
              <h4 className="font-black text-amber-800 uppercase text-[10px] mb-2">🚀 Conexión Automática para tu Bot:</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para que el bot consulte los datos en tiempo real, debe realizar peticiones <b>GET</b> a los siguientes endpoints de Supabase.
              </p>
            </div>

            {/* Endpoints Directos */}
            <div className="space-y-4">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Puntos de Enlace (Endpoints)</h5>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded">GET</span>
                  <code className="text-[10px] text-gray-600 bg-gray-50 p-1 rounded flex-1 truncate">{supabaseUrl}/rest/v1/rooms?select=*</code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded">GET</span>
                  <code className="text-[10px] text-gray-600 bg-gray-50 p-1 rounded flex-1 truncate">{supabaseUrl}/rest/v1/reservations?select=*</code>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mt-4">
                <h6 className="text-[10px] font-black text-gray-400 uppercase mb-3">Headers Obligatorios:</h6>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-indigo-600">apikey</span>
                    <span className="text-gray-400 truncate ml-4">{supabaseKey.substring(0,20)}...</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-indigo-600">Authorization</span>
                    <span className="text-gray-400">Bearer [Tu_Anon_Key]</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ejemplo CURL */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Ejemplo de consulta (CURL)</h5>
              <div className="bg-gray-800 p-4 rounded-xl">
                <pre className="text-[10px] text-green-400 overflow-x-auto">
{`curl -X GET "${supabaseUrl}/rest/v1/rooms" \\
  -H "apikey: ${supabaseKey.substring(0,15)}..." \\
  -H "Authorization: Bearer ${supabaseKey.substring(0,15)}..."`}
                </pre>
              </div>
            </div>

            {/* Edge Function Hint */}
            <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-xl relative overflow-hidden">
               <div className="absolute right-[-20px] top-[-20px] text-8xl opacity-10 rotate-12">⚡</div>
               <h4 className="font-black text-sm uppercase mb-2">¿Quieres un GET único?</h4>
               <p className="text-xs opacity-90 leading-relaxed mb-4">
                 Si no quieres hacer dos llamadas, puedes crear una <b>Edge Function</b> en Supabase que combine todo.
                 Copia el código de arriba y pégalo en la sección de "Functions" de tu panel de Supabase.
               </p>
               <div className="flex space-x-2">
                 <span className="bg-white/20 px-2 py-1 rounded text-[9px] font-bold">Respuesta combinada</span>
                 <span className="bg-white/20 px-2 py-1 rounded text-[9px] font-bold">Un solo Endpoint</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotIntegration;
