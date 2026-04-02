/**
 * socketService.js
 * ─────────────────────────────────────────────────────────────────
 * A module-level singleton Socket.IO client.
 *
 * WHY: Previously PatientDashboard and MyStats each called io(URL) 
 * independently, creating 2 separate WebSocket connections from the same 
 * browser tab. This caused:
 *   - Race conditions on join_room (one socket joins, the other doesn't)
 *   - Double memory usage
 *   - Missed events if one socket disconnects but the other doesn't
 *
 * FIX: Export a single socket instance. Both components import it from here.
 * The socket is created once, persists for the lifetime of the browser tab.
 * ─────────────────────────────────────────────────────────────────
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create ONE socket instance for the entire app
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],   // Try WebSocket first, fall back to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,         // Keep trying forever
    autoConnect: true,                      // Connect immediately on import
    withCredentials: false,
});

// ── Global Lifecycle Logging (visible in DevTools console) ──────────────────
socket.on('connect', () => {
    console.log(`%c✅ [SocketService] Connected — ID: ${socket.id}`, 'color: #22c55e; font-weight: bold;');
});

socket.on('disconnect', (reason) => {
    console.warn(`%c❌ [SocketService] Disconnected — Reason: ${reason}`, 'color: #ef4444;');
});

socket.on('connect_error', (err) => {
    console.error(`%c🔴 [SocketService] Connection error: ${err.message}`, 'color: #ef4444;');
});

socket.on('reconnect', (attempt) => {
    console.log(`%c🔄 [SocketService] Reconnected after ${attempt} attempt(s)`, 'color: #f59e0b;');
});

// ── Helper: join a room once, idempotently ──────────────────────────────────
let joinedRooms = new Set();

export const joinRoom = (roomId) => {
    if (!roomId) return;
    const id = roomId.toString();
    if (joinedRooms.has(id)) return; // Already joined — don't emit again
    joinedRooms.add(id);
    socket.emit('join_room', id);
    console.log(`%c📍 [SocketService] Joined room: ${id}`, 'color: #818cf8;');
};

// Re-join rooms after reconnect (socket ID changes on reconnect)
socket.on('connect', () => {
    // Re-emit join for all previously joined rooms after reconnect
    joinedRooms.forEach(roomId => {
        socket.emit('join_room', roomId);
        console.log(`%c📍 [SocketService] Re-joined room after reconnect: ${roomId}`, 'color: #818cf8;');
    });
});

// ── Helper: play an alert beep via Web Audio API (no extra dependencies) ────
export const playAlertBeep = (severity = 'warning') => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        
        const configs = {
            critical: [
                { freq: 880, duration: 0.15, delay: 0 },
                { freq: 660, duration: 0.15, delay: 0.2 },
                { freq: 880, duration: 0.15, delay: 0.4 },
            ],
            warning: [
                { freq: 660, duration: 0.2, delay: 0 },
                { freq: 520, duration: 0.2, delay: 0.3 },
            ],
        };

        const beeps = configs[severity] || configs.warning;

        beeps.forEach(({ freq, duration, delay }) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay);

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

            oscillator.start(ctx.currentTime + delay);
            oscillator.stop(ctx.currentTime + delay + duration + 0.05);
        });
    } catch (e) {
        console.warn('[SocketService] Audio alert failed:', e.message);
    }
};

export default socket;
