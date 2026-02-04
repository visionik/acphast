/**
 * Socket Definitions for Rete.js
 * Sockets define compatible connection types between nodes
 */
import { ClassicPreset } from 'rete';
/**
 * Socket for pipeline messages (main data flow)
 */
export declare class PipelineSocket extends ClassicPreset.Socket {
    constructor();
}
/**
 * Socket for control signals (triggers, events)
 */
export declare class ControlSocket extends ClassicPreset.Socket {
    constructor();
}
/**
 * Socket for configuration data
 */
export declare class ConfigSocket extends ClassicPreset.Socket {
    constructor();
}
/**
 * Singleton instances for socket types
 */
export declare const Sockets: {
    readonly pipeline: PipelineSocket;
    readonly control: ControlSocket;
    readonly config: ConfigSocket;
};
/**
 * Check if two sockets are compatible
 */
export declare function isCompatible(socket1: ClassicPreset.Socket, socket2: ClassicPreset.Socket): boolean;
//# sourceMappingURL=sockets.d.ts.map