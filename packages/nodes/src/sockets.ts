/**
 * Socket Definitions for Rete.js
 * Sockets define compatible connection types between nodes
 */

import { ClassicPreset } from 'rete';

/**
 * Socket for pipeline messages (main data flow)
 */
export class PipelineSocket extends ClassicPreset.Socket {
  constructor() {
    super('pipeline');
  }
}

/**
 * Socket for control signals (triggers, events)
 */
export class ControlSocket extends ClassicPreset.Socket {
  constructor() {
    super('control');
  }
}

/**
 * Socket for configuration data
 */
export class ConfigSocket extends ClassicPreset.Socket {
  constructor() {
    super('config');
  }
}

/**
 * Singleton instances for socket types
 */
export const Sockets = {
  pipeline: new PipelineSocket(),
  control: new ControlSocket(),
  config: new ConfigSocket(),
} as const;

/**
 * Check if two sockets are compatible
 */
export function isCompatible(
  socket1: ClassicPreset.Socket,
  socket2: ClassicPreset.Socket
): boolean {
  return socket1.name === socket2.name;
}
