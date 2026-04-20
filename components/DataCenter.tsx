
import React, { useState, useRef } from 'react';
import { Room, Reservation } from '../types';
import { api, supabase } from '../services/api';
import BotIntegration from './BotIntegration';

interface DataCenterProps {
  rooms: Room[];
  reservations: Reservation[];
  onRestore: () => void;
}

const DataCenter: React.FC<DataCenterProps> = ({ rooms, reservations, onRestore }) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'backup' | 'bot'>('supabase');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [diagResult, setDiagResult] = useState<{status: 'idle' | 'testing' | 'ok' | 'fail', message: string}>({status: 'idle', message: ''});
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestConnection = async () => {
    setDiagResult({status: 'testing', message: 'Verificando túnel de datos...'});
    const result = await api.testConnection();
    if (result.success) {
      setDiagResult({status: 'ok', message: result.message});
    } else {
      setDiagResult({status: 'fail', message: result.message});
    }
  };

  const sqlScript = `
-- HARAS DEL BOSQUE - SQL MIGRATION SCRIPT (v6.7)
-- FIX PARA RLS ACTIVO Y PERMISOS DE ESQUEMA

-- 1. ASEGURAR PERMISOS DE ESQUEMA (Vital para RLS)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- 2. TABLA DE UNIDADES (Asegurando columnas camelCase con comillas)
create table if not exists rooms (
  id text primary key,
  category text,
  number text,
  description text,
  capacity text,
  "colorClass" text,
  "basePrice" numeric default 0,
  "januaryPrice" numeric default 0,
  "februaryPrice" numeric default 0,
  "promoPrice" numeric default 0,
  "weekendPrice" numeric default 0,
  "selectedPriceType" text default 'standard',
  "videoUrl" text
);

-- Mantenimiento de columnas
alter table rooms add column if not exists "basePrice" numeric default 0;
alter table rooms add column if not exists "promoPrice" numeric default 0;
alter table rooms add column if not exists "januaryPrice" numeric default 0;
alter table rooms add column if not exists "februaryPrice" numeric default 0;
alter table rooms add column if not exists "weekendPrice" numeric default 0;
alter table rooms add column if not exists "selectedPriceType" text default 'standard';
alter table rooms add column if not exists "videoUrl" text;

-- 3. OTRAS TABLAS
create table if not exists guests (
  id text primary key,
  titular text,
  "fullName" text,
  address text,
  email text,
  phone text,
  "paymentStatus" text default 'pending',
  "dniDocs" jsonb default '{}'::jsonb,
  vehicle jsonb default '{}'::jsonb
);

create table if not exists reservations (
  id text primary key,
  "roomId" text references rooms(id) on delete cascade,
  "startDate" date,
  "endDate" date,
  "guestName" text,
  "guestId" text,
  amount numeric default 0,
  notes text,
  color text
);

create table if not exists special_prices (
  id text primary key,
  "roomId" text,
  "startDate" date,
  "endDate" date,
  price numeric default 0,
  label text
);

-- 4. POLÍTICAS RLS ROBUSTAS (Granulares)
alter table rooms enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table special_prices enable row level security;

-- Limpieza de políticas antiguas
drop policy if exists "Anon Access" on rooms;
drop policy if exists "Anon Access" on guests;
drop policy if exists "Anon Access" on reservations;
drop policy if exists "Anon Access" on special_prices;
drop policy if exists "Public Access" on rooms;
drop policy if exists "Public Access" on guests;
drop policy if exists "Public Access" on reservations;
drop policy if exists "Public Access" on special_prices;

-- Crear nuevas políticas universales para rol 'anon' y 'authenticated'
-- El 'upsert' requiere SELECT, INSERT y UPDATE.
create policy "Public Access" on rooms for all to anon, authenticated using (true) with check (true);
create policy "Public Access" on guests for all to anon, authenticated using (true) with check (true);
create policy "Public Access" on reservations for all to anon, authenticated using (true) with check (true);
create policy "Public Access" on special_prices for all to anon, authenticated using (true) with check (true);

-- Garantizar permisos finales
grant all on table rooms to anon, authenticated;
grant all on table guests to anon, authenticated;
grant all on table reservations to anon, authenticated;
grant all on table special_prices to anon, authenticated;
  `.trim();

  const handleDownloadBackup = async () => {
    const data = await api.getFullData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_haras_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        if (!data.rooms || !data.reservations) throw new Error("Backup inválido.");
        if (window.confirm("¿Restaurar backup? Esto sobrescribirá todo.")) {
          setIsRestoring(true);
          await api.restoreFullData(data);
          onRestore(); 
          alert("✅ Sistema restaurado.");
        }
      } catch (err: any) {
        alert("❌ Error: " + err.message);
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-3 flex space-x-6">
        {[
          { id: 'supabase', label: 'Conexión Nube', icon: '☁️' },
          { id: 'backup', label: 'Backup & Restore', icon: '🛡️' },
          { id: 'bot', label: 'Payload Bot', icon: '🤖' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 text-sm font-bold transition-all py-1 border-b-2
              ${activeTab === tab.id ? 'text-[#003580] border-[#003580]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'supabase' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#3ecf8e] text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg">☁️</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 tracking-tight">Supabase RLS Fix</h3>
                      <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Script de Reparación v6.7</p>
                    </div>
                  </div>
                  <button onClick={handleTestConnection} className="bg-[#003580] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-md">⚡ Probar Conexión</button>
                </div>

                {diagResult.status !== 'idle' && (
                  <div className={`p-4 rounded-xl mb-6 border-2 flex items-center space-x-3 animate-fade-in ${
                    diagResult.status === 'ok' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                  }`}>
                    <span className="font-bold text-sm uppercase">{diagResult.message}</span>
                  </div>
                )}

                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl mb-8">
                  <h4 className="font-black text-orange-800 uppercase text-xs mb-2">🚨 IMPORTANTE: RLS ACTIVADO</h4>
                  <p className="text-sm text-orange-800 leading-relaxed mb-4">
                    Al activar RLS, PostgreSQL bloquea los guardados por defecto. 
                    Copia este script y ejecútalo en el <b>SQL Editor</b> de Supabase para restaurar permisos.
                  </p>
                  <button onClick={() => copyToClipboard(sqlScript)} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm">{copyStatus === 'copied' ? 'Copiado ✅' : 'Copiar Script SQL v6.7'}</button>
                </div>

                <div className="bg-gray-900 rounded-2xl p-6 shadow-inner relative group">
                  <pre className="text-green-400 font-mono text-[10px] overflow-auto max-h-[350px] leading-relaxed">{sqlScript}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:border-[#003580] transition-all group">
                  <div className="w-16 h-16 bg-blue-50 text-[#003580] rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📤</div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Exportar Todo</h3>
                  <button onClick={handleDownloadBackup} className="w-full bg-[#003580] text-white py-4 rounded-xl font-bold">Generar Backup (.json)</button>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 group relative">
                  <div className="w-16 h-16 bg-green-50 text-[#217346] rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📥</div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Restaurar Sistema</h3>
                  <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#217346] text-white py-4 rounded-xl font-bold">Seleccionar Archivo</button>
                </div>
            </div>
          )}

          {activeTab === 'bot' && (
            <BotIntegration rooms={rooms} reservations={reservations} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DataCenter;
