import { describe, it, expect } from 'vitest';
import {
  isJsonRpcRequest,
  isJsonRpcNotification,
  isJsonRpcResponse,
  isJsonRpcError,
  JsonRpcErrorCode,
} from './jsonrpc.js';

describe('JSON-RPC Type Guards', () => {
  describe('isJsonRpcRequest', () => {
    it('should return true for valid request with string id', () => {
      const req = {
        jsonrpc: '2.0',
        method: 'test',
        params: { foo: 'bar' },
        id: 'req-1',
      };
      expect(isJsonRpcRequest(req)).toBe(true);
    });

    it('should return true for valid request with number id', () => {
      const req = {
        jsonrpc: '2.0',
        method: 'test',
        id: 42,
      };
      expect(isJsonRpcRequest(req)).toBe(true);
    });

    it('should return true for valid request with null id', () => {
      const req = {
        jsonrpc: '2.0',
        method: 'test',
        id: null,
      };
      expect(isJsonRpcRequest(req)).toBe(true);
    });

    it('should return true for request without params', () => {
      const req = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };
      expect(isJsonRpcRequest(req)).toBe(true);
    });

    it('should return false for wrong jsonrpc version', () => {
      const req = {
        jsonrpc: '1.0',
        method: 'test',
        id: 1,
      };
      expect(isJsonRpcRequest(req)).toBe(false);
    });

    it('should return false for missing method', () => {
      const req = {
        jsonrpc: '2.0',
        id: 1,
      };
      expect(isJsonRpcRequest(req)).toBe(false);
    });

    it('should return false for missing id', () => {
      const req = {
        jsonrpc: '2.0',
        method: 'test',
      };
      expect(isJsonRpcRequest(req)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isJsonRpcRequest(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isJsonRpcRequest('string')).toBe(false);
      expect(isJsonRpcRequest(123)).toBe(false);
      expect(isJsonRpcRequest(undefined)).toBe(false);
    });
  });

  describe('isJsonRpcNotification', () => {
    it('should return true for valid notification', () => {
      const notif = {
        jsonrpc: '2.0',
        method: 'notify',
        params: { data: 'test' },
      };
      expect(isJsonRpcNotification(notif)).toBe(true);
    });

    it('should return true for notification without params', () => {
      const notif = {
        jsonrpc: '2.0',
        method: 'notify',
      };
      expect(isJsonRpcNotification(notif)).toBe(true);
    });

    it('should return false if id is present', () => {
      const notif = {
        jsonrpc: '2.0',
        method: 'notify',
        id: 1,
      };
      expect(isJsonRpcNotification(notif)).toBe(false);
    });

    it('should return false for wrong jsonrpc version', () => {
      const notif = {
        jsonrpc: '1.0',
        method: 'notify',
      };
      expect(isJsonRpcNotification(notif)).toBe(false);
    });

    it('should return false for missing method', () => {
      const notif = {
        jsonrpc: '2.0',
      };
      expect(isJsonRpcNotification(notif)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isJsonRpcNotification(null)).toBe(false);
    });
  });

  describe('isJsonRpcResponse', () => {
    it('should return true for valid response', () => {
      const res = {
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      };
      expect(isJsonRpcResponse(res)).toBe(true);
    });

    it('should return true for response with null result', () => {
      const res = {
        jsonrpc: '2.0',
        result: null,
        id: 1,
      };
      expect(isJsonRpcResponse(res)).toBe(true);
    });

    it('should return true for response with undefined result', () => {
      const res = {
        jsonrpc: '2.0',
        result: undefined,
        id: 1,
      };
      expect(isJsonRpcResponse(res)).toBe(true);
    });

    it('should return false for missing result', () => {
      const res = {
        jsonrpc: '2.0',
        id: 1,
      };
      expect(isJsonRpcResponse(res)).toBe(false);
    });

    it('should return false for missing id', () => {
      const res = {
        jsonrpc: '2.0',
        result: 'test',
      };
      expect(isJsonRpcResponse(res)).toBe(false);
    });

    it('should return false for wrong jsonrpc version', () => {
      const res = {
        jsonrpc: '1.0',
        result: 'test',
        id: 1,
      };
      expect(isJsonRpcResponse(res)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isJsonRpcResponse(null)).toBe(false);
    });
  });

  describe('isJsonRpcError', () => {
    it('should return true for valid error', () => {
      const err = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };
      expect(isJsonRpcError(err)).toBe(true);
    });

    it('should return true for error with data', () => {
      const err = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: { details: 'Something went wrong' },
        },
        id: null,
      };
      expect(isJsonRpcError(err)).toBe(true);
    });

    it('should return false for missing error object', () => {
      const err = {
        jsonrpc: '2.0',
        id: 1,
      };
      expect(isJsonRpcError(err)).toBe(false);
    });

    it('should return false for null error', () => {
      const err = {
        jsonrpc: '2.0',
        error: null,
        id: 1,
      };
      expect(isJsonRpcError(err)).toBe(false);
    });

    it('should return false for non-object error', () => {
      const err = {
        jsonrpc: '2.0',
        error: 'error string',
        id: 1,
      };
      expect(isJsonRpcError(err)).toBe(false);
    });

    it('should return false for missing id', () => {
      const err = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      };
      expect(isJsonRpcError(err)).toBe(false);
    });

    it('should return false for wrong jsonrpc version', () => {
      const err = {
        jsonrpc: '1.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };
      expect(isJsonRpcError(err)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isJsonRpcError(null)).toBe(false);
    });
  });

  describe('JsonRpcErrorCode', () => {
    it('should have correct error code values', () => {
      expect(JsonRpcErrorCode.ParseError).toBe(-32700);
      expect(JsonRpcErrorCode.InvalidRequest).toBe(-32600);
      expect(JsonRpcErrorCode.MethodNotFound).toBe(-32601);
      expect(JsonRpcErrorCode.InvalidParams).toBe(-32602);
      expect(JsonRpcErrorCode.InternalError).toBe(-32603);
      expect(JsonRpcErrorCode.ServerError).toBe(-32000);
    });
  });
});
