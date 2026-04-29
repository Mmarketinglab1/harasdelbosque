
import emailjs from '@emailjs/browser';

const runtimeEnv = (window as any).process?.env || {};
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || runtimeEnv.VITE_EMAILJS_SERVICE_ID || runtimeEnv.EMAILJS_SERVICE_ID;
const TEMPLATE_RESERVATION_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_RESERVATION_ID || runtimeEnv.VITE_EMAILJS_TEMPLATE_RESERVATION_ID || runtimeEnv.EMAILJS_TEMPLATE_RESERVATION_ID;
const TEMPLATE_PAYMENT_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_PAYMENT_ID || runtimeEnv.VITE_EMAILJS_TEMPLATE_PAYMENT_ID || runtimeEnv.EMAILJS_TEMPLATE_PAYMENT_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || runtimeEnv.VITE_EMAILJS_PUBLIC_KEY || runtimeEnv.EMAILJS_PUBLIC_KEY;

// Inicializar EmailJS con la clave pública
if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY);
}

export const emailService = {
  sendReservationConfirmation: async (data: {
    guest_name: string;
    guest_email: string;
    check_in: string;
    check_out: string;
    room_number: string;
    total_amount: string;
  }) => {
    if (!PUBLIC_KEY) return { success: false, message: "Falta Public Key" };

    try {
      const templateParams = {
        to_name: data.guest_name,
        guest_name: data.guest_name, // Doble mapeo por seguridad
        to_email: data.guest_email,
        guest_email: data.guest_email,
        check_in: data.check_in,
        check_out: data.check_out,
        room: data.room_number,
        amount: data.total_amount,
        reply_to: "info@harasdelbosque.com"
      };

      console.log("Intentando enviar email de reserva a:", data.guest_email, templateParams);

      const result = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_RESERVATION_ID,
        templateParams,
        PUBLIC_KEY
      );
      
      console.log("Respuesta EmailJS (Reserva):", result);
      return { success: true, result };
    } catch (error: any) {
      console.error("Error crítico EmailJS (Reserva):", error);
      return { success: false, error: error.text || error.message || "Error desconocido" };
    }
  },

  sendPaymentConfirmation: async (data: {
    guest_name: string;
    guest_email: string;
    checkin_url: string;
    subject?: string;
  }) => {
    if (!PUBLIC_KEY) return { success: false, message: "Falta Public Key" };

    try {
      const templateParams = {
        to_name: data.guest_name,
        guest_name: data.guest_name,
        to_email: data.guest_email,
        guest_email: data.guest_email,
        checkin_url: data.checkin_url,
        subject: data.subject || "¡Pago Confirmado! Realiza tu Check-in — Haras del Bosque"
      };

      console.log("Intentando enviar email de Check-in a:", data.guest_email, templateParams);

      const result = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_PAYMENT_ID,
        templateParams,
        PUBLIC_KEY
      );

      console.log("Respuesta EmailJS (Pago/Check-in):", result);
      return { success: true, result };
    } catch (error: any) {
      console.error("Error crítico EmailJS (Pago/Check-in):", error);
      return { success: false, error: error.text || error.message || "Error desconocido" };
    }
  },

  sendRecoveryEmail: async (email: string, content: string) => {
    if (!PUBLIC_KEY) return { success: false };
    try {
      await emailjs.send(
        SERVICE_ID, 
        "template_recovery", 
        { 
          to_email: email, 
          message_body: content 
        }, 
        PUBLIC_KEY
      );
      return { success: true };
    } catch (e) { 
      console.error("Error Email Recovery:", e);
      return { success: false }; 
    }
  }
};
