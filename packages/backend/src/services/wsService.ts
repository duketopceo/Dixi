import type { WebSocketService } from './websocket';

/**
 * Registry for the WebSocketService singleton.
 *
 * Route modules must NOT import '../index' for wsService — index imports the
 * routes, so that creates a circular dependency where `trackingRoutes` (and
 * friends) resolve to undefined depending on module entry order, crashing
 * `app.use()` at import time (seen when tests import a route file directly).
 */
let instance: WebSocketService | null = null;

export function setWSService(service: WebSocketService | null): void {
  instance = service;
}

export function getWSService(): WebSocketService | null {
  return instance;
}
