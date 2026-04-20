
import React, { useState } from 'react';
import { UserSession, UserRole } from '../types';
import { GoogleGenAI } from "@google/genai";
import { emailService } from '../services/emailService';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  onGoToPublic: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToPublic }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sent'>('idle');
  const [emailPreview, setEmailPreview] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let role: UserRole | null = null;
    
    if (username === 'sadmin' && password === 'sadmin') role = 'superadmin';
    else if (username === 'admin' && password === 'admin') role = 'admin';
    else if (username === 'user' && password === 'user') role = 'user';

    if (role) {
      onLogin({ username, role, isLoggedIn: true });
    } else {
      setError('Credenciales incorrectas. Verifique usuario y contraseña.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsSending(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera un correo electrónico profesional y elegante de recuperación de contraseña para un sistema de administración hotelera llamado "Haras del Bosque". 
        El correo va dirigido a: ${forgotEmail}. 
        Incluye un asunto atractivo y un botón de "Cambiar Contraseña" (simulado con texto). 
        El tono debe ser servicial y seguro. Explica que el enlace expira en 24 horas.`,
        config: {
          systemInstruction: "Eres el sistema de notificaciones automáticas de Haras del Bosque. Generas respuestas en formato texto que simulan el cuerpo de un correo electrónico institucional."
        }
      });

      const body = response.text || 'Solicitud de restablecimiento recibida.';
      setEmailPreview(body);
      
      // Intentar envío real si EmailJS está configurado
      await emailService.sendRecoveryEmail(forgotEmail, body);
      
      setForgotStatus('sent');
    } catch (err) {
      console.error("Error al procesar recuperación:", err);
      setEmailPreview(`Para: ${forgotEmail}\nAsunto: Recuperación de Acceso - Haras del Bosque\n\nHemos recibido una solicitud para restablecer su contraseña. Haga clic en el siguiente enlace: [Restablecer Contraseña]`);
      setForgotStatus('sent');
    } finally {
      setIsSending(false);
    }
  };

  const handleResetForgot = () => {
    setIsForgotMode(false);
    setForgotStatus('idle');
    setForgotEmail('');
    setEmailPreview('');
  };

  return (
    <div className="min-h-screen bg-[#003580] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white opacity-5 rounded-full"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] bg-[#feba02] opacity-10 rounded-full"></div>

      <div className="mb-8 text-center animate-fade-in relative z-10">
        <button 
          onClick={onGoToPublic}
          className="bg-[#feba02] text-[#003580] px-8 py-4 rounded-full font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white flex items-center space-x-3"
        >
          <span className="text-2xl">🌍</span>
          <span>RESERVAR ONLINE (PORTAL HUÉSPEDES)</span>
        </button>
      </div>

      <div className={`bg-white w-full ${forgotStatus === 'sent' ? 'max-w-2xl' : 'max-w-md'} rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 animate-fade-in relative z-10 border border-white/20`}>
        <div className="bg-white p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#003580] tracking-tight mb-2">Haras del <span className="text-[#feba02]">Bosque</span></h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Panel Administrativo</p>
          </div>

          {!isForgotMode ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-xs font-bold rounded-r-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Usuario</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">👤</span>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl focus:border-[#003580] outline-none font-semibold text-gray-700"
                    placeholder="Administrador"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Contraseña</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔑</span>
                  <input 
                    type="password"
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl focus:border-[#003580] outline-none font-semibold text-gray-700"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#003580] text-white p-4 rounded-2xl font-bold text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <span>Acceso Staff</span>
              </button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setIsForgotMode(true)}
                  className="text-xs font-bold text-[#003580] opacity-60"
                >
                  ¿Olvidaste la contraseña?
                </button>
              </div>
            </form>
          ) : (
            <div className="animate-fade-in">
              {forgotStatus === 'sent' ? (
                <div className="space-y-6">
                  <div className="bg-green-50 p-6 text-green-800 rounded-xl">
                    <p className="text-sm font-bold mb-2">Instrucciones enviadas</p>
                    <p className="text-xs">Se ha enviado un correo a {forgotEmail}.</p>
                    <pre className="mt-4 p-4 bg-white/50 rounded-lg text-[10px] font-mono whitespace-pre-wrap border border-green-200">
                      {emailPreview}
                    </pre>
                  </div>
                  <button onClick={handleResetForgot} className="w-full bg-gray-100 p-4 rounded-2xl font-bold">Volver</button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email Registrado</label>
                    <input 
                      type="email"
                      required
                      className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-[#feba02]"
                      placeholder="Tu email de trabajo"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="w-full bg-[#feba02] text-[#003580] p-4 rounded-2xl font-bold shadow-lg flex items-center justify-center space-x-2"
                  >
                    {isSending ? <div className="w-5 h-5 border-2 border-[#003580]/30 border-t-[#003580] rounded-full animate-spin"></div> : <span>Restablecer Acceso</span>}
                  </button>
                  <button onClick={() => setIsForgotMode(false)} className="w-full text-xs font-bold text-gray-400 hover:text-gray-600">Cancelar</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
