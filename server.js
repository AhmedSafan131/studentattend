/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║         UniAttend — Socket.IO Bridge Server               ║
 * ║                                                           ║
 * ║  Port 3001 — Relays student attendance events             ║
 * ║  between the Flutter mobile app and the React dashboard   ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Flow:
 *   [Flutter App]  ──emit('student_attended')──► [This Server]
 *   [This Server]  ──emit('student_attended')──► [React Dashboard]
 *
 * Run with:  node server.js
 */

const http   = require('http');
const { Server } = require('socket.io');

const PORT = 3001;

// ── Create raw HTTP server (no Express needed) ──────────────
const httpServer = http.createServer((req, res) => {
  // Simple health-check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'UniAttend Socket Bridge', port: PORT }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// ── Attach Socket.IO with permissive CORS ───────────────────
// Allows connections from:
//   • React dev server  (localhost:3000)
//   • Flutter app       (any origin — mobile devices on LAN)
const io = new Server(httpServer, {
  cors: {
    origin: '*',          // Open for LAN/mobile access
    methods: ['GET', 'POST'],
  },
  // Allow Flutter's socket.io client (older protocol versions)
  allowEIO3: true,
});

// ── Track connected clients ────────────────────────────────
let dashboardCount = 0;
let mobileCount    = 0;

io.on('connection', (socket) => {
  const clientType = socket.handshake.query.clientType || 'unknown';

  // ── Register client type ──────────────────────────────
  if (clientType === 'dashboard') {
    dashboardCount++;
    console.log(`[+] Dashboard connected    (id=${socket.id}) | dashboards=${dashboardCount}`);

    // Tell the dashboard its own socket ID and the current state
    socket.emit('server_hello', {
      message:    'Connected to UniAttend bridge server',
      socketId:   socket.id,
      dashboards: dashboardCount,
    });
  } else {
    mobileCount++;
    console.log(`[+] Mobile/Flutter connected (id=${socket.id}, type=${clientType}) | mobiles=${mobileCount}`);

    socket.emit('server_hello', {
      message:  'UniAttend bridge ready. Emit student_attended to register attendance.',
      socketId: socket.id,
    });
  }

  // ─────────────────────────────────────────────────────────
  // EVENT: student_attended
  // Emitted by the Flutter app when a student scans the QR.
  //
  // Expected payload from Flutter:
  // {
  //   "name":          "Liam Carter",
  //   "universityId":  "220110234",
  //   "lectureId":     "LEC-ABC123",     // optional — for validation
  //   "timestamp":     1709487600000     // optional — epoch ms, falls back to server time
  // }
  // ─────────────────────────────────────────────────────────
  socket.on('student_attended', (data) => {
    // Validate minimum required fields
    if (!data || !data.name || !data.universityId) {
      console.warn(`[!] Invalid student_attended payload from ${socket.id}:`, data);
      socket.emit('server_error', {
        event:   'student_attended',
        message: 'Missing required fields: name, universityId',
      });
      return;
    }

    // Enrich payload with server timestamp if not provided
    const enriched = {
      name:         String(data.name).trim(),
      universityId: String(data.universityId).trim(),
      lectureId:    data.lectureId   ? String(data.lectureId).trim()   : null,
      timestamp:    data.timestamp   ? Number(data.timestamp)          : Date.now(),
      // Compute a human-readable scan time on the server side
      scanTime: new Date(data.timestamp || Date.now()).toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      receivedAt: Date.now(),
    };

    console.log(`[✓] student_attended → name="${enriched.name}" | id=${enriched.universityId} | lecture=${enriched.lectureId || 'n/a'}`);

    // ── Relay to ALL connected dashboard browsers ──────────
    // Using io.emit so EVERY dashboard tab receives it.
    // If you want targeted relay (specific lecture room) use:
    //   socket.to('lecture:' + enriched.lectureId).emit(...)
    io.emit('student_attended', enriched);

    // Acknowledge the sender (Flutter app)
    socket.emit('student_attended_ack', {
      received: true,
      name:     enriched.name,
      id:       enriched.universityId,
    });
  });

  // ─────────────────────────────────────────────────────────
  // EVENT: lecture_started  (optional — from dashboard)
  // Lets the server know which lecture is active, so it can
  // validate incoming QR scans by lectureId.
  // ─────────────────────────────────────────────────────────
  socket.on('lecture_started', (data) => {
    console.log(`[▶] Lecture started → id=${data?.lectureId}, course=${data?.course}`);
    // Broadcast to all clients so mobiles know the active lecture
    socket.broadcast.emit('lecture_started', data);
  });

  // ─────────────────────────────────────────────────────────
  // EVENT: lecture_ended  (optional — from dashboard)
  // ─────────────────────────────────────────────────────────
  socket.on('lecture_ended', (data) => {
    console.log(`[■] Lecture ended → id=${data?.lectureId}`);
    socket.broadcast.emit('lecture_ended', data);
  });

  // ─────────────────────────────────────────────────────────
  // EVENT: ping  (optional — heartbeat from Flutter)
  // ─────────────────────────────────────────────────────────
  socket.on('ping_server', () => {
    socket.emit('pong_server', { time: Date.now() });
  });

  // ── Disconnect ────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    if (clientType === 'dashboard') {
      dashboardCount = Math.max(0, dashboardCount - 1);
      console.log(`[-] Dashboard disconnected (id=${socket.id}, reason=${reason}) | dashboards=${dashboardCount}`);
    } else {
      mobileCount = Math.max(0, mobileCount - 1);
      console.log(`[-] Mobile disconnected   (id=${socket.id}, reason=${reason}) | mobiles=${mobileCount}`);
    }
  });
});

// ── Start server ───────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     UniAttend Socket Bridge — RUNNING             ║');
  console.log(`║     Port : ${PORT}                                    ║`);
  console.log('║     CORS : * (open for Flutter + React)           ║');
  console.log('║                                                   ║');
  console.log('║  Events handled:                                  ║');
  console.log('║    ← student_attended   (from Flutter)            ║');
  console.log('║    → student_attended   (to React dashboard)      ║');
  console.log('║    ← lecture_started    (from React dashboard)    ║');
  console.log('║    ← lecture_ended      (from React dashboard)    ║');
  console.log('║                                                   ║');
  console.log('║  Health check:  http://localhost:3001/health      ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
});
