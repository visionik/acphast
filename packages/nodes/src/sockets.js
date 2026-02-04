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
};
/**
 * Check if two sockets are compatible
 */
export function isCompatible(socket1, socket2) {
    return socket1.name === socket2.name;
}
//# sourceMappingURL=sockets.js.map