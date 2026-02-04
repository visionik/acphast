import { describe, it, expect } from 'vitest';
import {
  TransportError,
  TransportConnectionError,
  TransportParseError,
} from './transport.js';

describe('TransportError', () => {
  it('should create error with message', () => {
    const error = new TransportError('Transport failed');
    expect(error.message).toBe('Transport failed');
    expect(error.name).toBe('TransportError');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new TransportError('Transport failed', cause);
    expect(error.message).toBe('Transport failed');
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of Error', () => {
    const error = new TransportError('Test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('TransportConnectionError', () => {
  it('should create error with message', () => {
    const error = new TransportConnectionError('Connection refused');
    expect(error.message).toBe('Connection refused');
    expect(error.name).toBe('TransportConnectionError');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new TransportConnectionError('Connection refused', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of TransportError', () => {
    const error = new TransportConnectionError('Test');
    expect(error).toBeInstanceOf(TransportError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('TransportParseError', () => {
  it('should create error with message', () => {
    const error = new TransportParseError('Invalid JSON');
    expect(error.message).toBe('Invalid JSON');
    expect(error.name).toBe('TransportParseError');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new SyntaxError('Unexpected token');
    const error = new TransportParseError('Invalid JSON', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of TransportError', () => {
    const error = new TransportParseError('Test');
    expect(error).toBeInstanceOf(TransportError);
    expect(error).toBeInstanceOf(Error);
  });
});
