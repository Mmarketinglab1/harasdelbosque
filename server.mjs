import { createClient } from '@supabase/supabase-js';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');
const port = Number(process.env.PORT || 8080);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const json = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(payload));
};

const publicEnvKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'EMAILJS_SERVICE_ID',
  'EMAILJS_TEMPLATE_RESERVATION_ID',
  'EMAILJS_TEMPLATE_PAYMENT_ID',
  'EMAILJS_PUBLIC_KEY',
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_RESERVATION_ID',
  'VITE_EMAILJS_TEMPLATE_PAYMENT_ID',
  'VITE_EMAILJS_PUBLIC_KEY',
];

const publicEnvScript = () => {
  const env = Object.fromEntries(
    publicEnvKeys
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]])
  );

  return `<script>window.process=window.process||{};window.process.env=${JSON.stringify(env)};</script>`;
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) return JSON.parse(raw);

  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
};

const getNightsInRange = (startDate, endDate) => {
  const nights = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current < end) {
    nights.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return nights;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => {
  return aStart < bEnd && bStart < aEnd;
};

const calculateTotal = (room, specialPrices, startDate, endDate) => {
  const nights = getNightsInRange(startDate, endDate);
  let total = 0;

  for (const dateStr of nights) {
    const date = new Date(`${dateStr}T00:00:00`);
    const month = date.getMonth();
    const day = date.getDay();

    const specialPrice = specialPrices.find((price) => {
      return (price.roomId === room.id || price.roomId === 'all')
        && dateStr >= price.startDate
        && dateStr <= price.endDate;
    });

    if (specialPrice) {
      total += Number(specialPrice.price || 0);
      continue;
    }

    if (month === 0) {
      total += Number(room.januaryPrice || 0) / 7;
      continue;
    }

    if (month === 1) {
      total += Number(room.februaryPrice || 0) / 7;
      continue;
    }

    if ((day === 0 || day === 5 || day === 6) && Number(room.weekendPrice || 0) > 0) {
      total += Number(room.weekendPrice || 0);
      continue;
    }

    if (room.selectedPriceType === 'promo') total += Number(room.promoPrice || 0);
    else if (room.selectedPriceType === 'january') total += Number(room.januaryPrice || 0) / 7;
    else if (room.selectedPriceType === 'february') total += Number(room.februaryPrice || 0) / 7;
    else total += Number(room.basePrice || 0);
  }

  return Math.round(total);
};

const loadBookingData = async () => {
  if (!supabase) {
    throw new Error('Faltan SUPABASE_URL/SUPABASE_ANON_KEY o VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  }

  const [roomsResult, reservationsResult, specialPricesResult] = await Promise.all([
    supabase.from('rooms').select('*').order('number'),
    supabase.from('reservations').select('*'),
    supabase.from('special_prices').select('*'),
  ]);

  if (roomsResult.error) throw roomsResult.error;
  if (reservationsResult.error) throw reservationsResult.error;
  if (specialPricesResult.error) throw specialPricesResult.error;

  return {
    rooms: roomsResult.data || [],
    reservations: reservationsResult.data || [],
    specialPrices: specialPricesResult.data || [],
  };
};

const handleAvailability = async (req, res, url) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  const startDate = url.searchParams.get('start')
    || url.searchParams.get('startDate')
    || url.searchParams.get('checkIn')
    || url.searchParams.get('from');
  const endDate = url.searchParams.get('end')
    || url.searchParams.get('endDate')
    || url.searchParams.get('checkOut')
    || url.searchParams.get('to');

  if (!startDate || !endDate) {
    return json(res, 400, {
      error: 'missing_dates',
      message: 'Enviar start y end en formato YYYY-MM-DD.',
    });
  }

  if (endDate <= startDate) {
    return json(res, 400, {
      error: 'invalid_dates',
      message: 'La fecha end debe ser posterior a start.',
    });
  }

  const { rooms, reservations, specialPrices } = await loadBookingData();
  const availableRooms = rooms
    .filter((room) => {
      return !reservations.some((reservation) => {
        return reservation.roomId === room.id
          && overlaps(startDate, endDate, reservation.startDate, reservation.endDate);
      });
    })
    .map((room) => ({
      id: room.id,
      number: room.number,
      category: room.category,
      description: room.description,
      capacity: room.capacity,
      videoUrl: room.videoUrl || '',
      prices: {
        nightly: Number(room.basePrice || 0),
        weekend: Number(room.weekendPrice || 0),
        january_week: Number(room.januaryPrice || 0),
        february_week: Number(room.februaryPrice || 0),
        promo: Number(room.promoPrice || 0),
      },
      totalPrice: calculateTotal(room, specialPrices, startDate, endDate),
    }));
  const roomsByNumber = Object.fromEntries(
    availableRooms.map((room) => [room.number, room])
  );

  return json(res, 200, {
    startDate,
    endDate,
    nights: getNightsInRange(startDate, endDate).length,
    rooms: roomsByNumber,
    roomsList: availableRooms,
  });
};

const handleReserve = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!supabase) throw new Error('Faltan SUPABASE_URL/SUPABASE_ANON_KEY o VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');

  const body = await parseBody(req);
  const roomNumber = String(body.roomNumber || body.room || '').trim();
  const clientName = String(body.clientName || body.guestName || '').trim();
  const clientPhone = String(body.clientPhone || body.phone || '').trim();
  const startDate = String(body.startDate || body.start || '').trim();
  const endDate = String(body.endDate || body.end || '').trim();
  const totalPrice = Number(body.totalPrice || body.amount || 0);
  const status = String(body.status || 'Pendiente').trim();

  if (!roomNumber || !clientName || !clientPhone || !startDate || !endDate || !totalPrice) {
    return json(res, 400, {
      error: 'missing_fields',
      message: 'Enviar roomNumber, clientName, clientPhone, startDate, endDate y totalPrice.',
    });
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('number', roomNumber)
    .single();

  if (roomError || !room) {
    return json(res, 404, {
      error: 'room_not_found',
      message: `No se encontro el apart ${roomNumber}.`,
    });
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from('reservations')
    .select('id')
    .eq('roomId', room.id)
    .lt('startDate', endDate)
    .gt('endDate', startDate);

  if (conflictError) throw conflictError;
  if (conflicts?.length) {
    return json(res, 409, {
      error: 'room_not_available',
      message: `El apart ${roomNumber} ya no esta disponible para esas fechas.`,
    });
  }

  const reservation = {
    id: globalThis.crypto.randomUUID(),
    roomId: room.id,
    startDate,
    endDate,
    guestName: clientName,
    guestId: '',
    amount: totalPrice,
    notes: `Reserva bot - Tel: ${clientPhone} - Estado: ${status}`,
    color: 'bg-sky-400',
  };

  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
    .single();

  if (error) throw error;

  return json(res, 201, {
    success: true,
    reservation: data,
    room: {
      id: room.id,
      number: room.number,
      category: room.category,
    },
  });
};

const serveStatic = async (req, res, url) => {
  const requestedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(distDir, safePath);

  if (requestedPath === '/' || !existsSync(filePath)) {
    filePath = join(distDir, 'index.html');
  }

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = extname(filePath);
  if (ext === '.html') {
    const html = await readFile(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentTypes[ext] });
    res.end(html.replace('</head>', `${publicEnvScript()}</head>`));
    return;
  }

  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
};

createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  try {
    if (url.pathname === '/api/health') {
      return json(res, 200, { ok: true, supabase: Boolean(supabase) });
    }

    if (url.pathname === '/api/bot/availability') {
      return await handleAvailability(req, res, url);
    }

    if (url.pathname === '/api/bot/reserve') {
      return await handleReserve(req, res);
    }

    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return json(res, 500, {
      error: 'server_error',
      message: error.message || 'Error interno del servidor.',
    });
  }
}).listen(port, () => {
  console.log(`Haras server listening on ${port}`);
});
