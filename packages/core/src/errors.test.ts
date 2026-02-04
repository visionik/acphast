import { describe, it, expect } from 'vitest';
import {
  createACPError,
  isTransientError,
  isPermanentError,
  AcphastError,
  BackendUnavailableError,
  BackendError,
  CapabilityUnsupportedError,
  RateLimitError,
  ContextExceededError,
  AuthenticationError,
  ParseError,
  InvalidRequestError,
  MethodNotFoundError,
  InvalidParamsError,
  InternalError,
} from './errors.js';
import { ACPErrorCode } from './acp.js';

describe('createACPError', () => {
  it('should create error with code and message', () => {
    const error = createACPError(ACPErrorCode.InternalError, 'Something went wrong');
    expect(error).toEqual({
      code: ACPErrorCode.InternalError,
      message: 'Something went wrong',
      data: undefined,
    });
  });

  it('should create error with data', () => {
    const error = createACPError(ACPErrorCode.InvalidParams, 'Bad params', { field: 'model' });
    expect(error).toEqual({
      code: ACPErrorCode.InvalidParams,
      message: 'Bad params',
      data: { field: 'model' },
    });
  });
});

describe('isTransientError', () => {
  it('should return true for RateLimited error', () => {
    const error = { code: ACPErrorCode.RateLimited, message: 'Rate limited' };
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for BackendUnavailable error', () => {
    const error = { code: ACPErrorCode.BackendUnavailable, message: 'Unavailable' };
    expect(isTransientError(error)).toBe(true);
  });

  it('should return true for Service unavailable (503)', () => {
    const error = { code: -503, message: 'Service unavailable' };
    expect(isTransientError(error)).toBe(true);
  });

  it('should return false for permanent errors', () => {
    const error = { code: ACPErrorCode.AuthFailed, message: 'Auth failed' };
    expect(isTransientError(error)).toBe(false);
  });

  it('should return false for regular Error without code', () => {
    const error = new Error('Generic error');
    expect(isTransientError(error)).toBe(false);
  });
});

describe('isPermanentError', () => {
  it('should return true for AuthFailed error', () => {
    const error = { code: ACPErrorCode.AuthFailed, message: 'Auth failed' };
    expect(isPermanentError(error)).toBe(true);
  });

  it('should return true for InvalidParams error', () => {
    const error = { code: ACPErrorCode.InvalidParams, message: 'Invalid params' };
    expect(isPermanentError(error)).toBe(true);
  });

  it('should return true for InvalidRequest error', () => {
    const error = { code: ACPErrorCode.InvalidRequest, message: 'Invalid request' };
    expect(isPermanentError(error)).toBe(true);
  });

  it('should return true for CapabilityUnsupported error', () => {
    const error = { code: ACPErrorCode.CapabilityUnsupported, message: 'Not supported' };
    expect(isPermanentError(error)).toBe(true);
  });

  it('should return false for transient errors', () => {
    const error = { code: ACPErrorCode.RateLimited, message: 'Rate limited' };
    expect(isPermanentError(error)).toBe(false);
  });

  it('should return false for regular Error without code', () => {
    const error = new Error('Generic error');
    expect(isPermanentError(error)).toBe(false);
  });
});

describe('AcphastError', () => {
  it('should create error with correct properties', () => {
    const error = new AcphastError('Test error', ACPErrorCode.InternalError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ACPErrorCode.InternalError);
    expect(error.name).toBe('AcphastError');
    expect(error.data).toBeUndefined();
  });

  it('should create error with data', () => {
    const error = new AcphastError('Test error', ACPErrorCode.InternalError, { foo: 'bar' });
    expect(error.data).toEqual({ foo: 'bar' });
  });

  it('should convert to ACPError', () => {
    const error = new AcphastError('Test error', ACPErrorCode.InternalError, { foo: 'bar' });
    const acpError = error.toACPError();
    expect(acpError).toEqual({
      code: ACPErrorCode.InternalError,
      message: 'Test error',
      data: { foo: 'bar' },
    });
  });

  it('should be an instance of Error', () => {
    const error = new AcphastError('Test', ACPErrorCode.InternalError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('BackendUnavailableError', () => {
  it('should create error with backend name', () => {
    const error = new BackendUnavailableError('openai');
    expect(error.message).toBe('Backend "openai" is unavailable');
    expect(error.code).toBe(ACPErrorCode.BackendUnavailable);
    expect(error.name).toBe('BackendUnavailableError');
    expect(error.data).toEqual({ backend: 'openai', cause: undefined });
  });

  it('should include cause when provided', () => {
    const cause = new Error('Connection refused');
    const error = new BackendUnavailableError('anthropic', cause);
    expect(error.data).toEqual({ backend: 'anthropic', cause: 'Connection refused' });
  });
});

describe('BackendError', () => {
  it('should create error with backend name and original error', () => {
    const error = new BackendError('anthropic', { status: 500 });
    expect(error.message).toBe('Backend "anthropic" returned an error');
    expect(error.code).toBe(ACPErrorCode.BackendError);
    expect(error.name).toBe('BackendError');
    expect(error.data).toEqual({ backend: 'anthropic', originalError: { status: 500 } });
  });
});

describe('CapabilityUnsupportedError', () => {
  it('should create error with capability and backend', () => {
    const error = new CapabilityUnsupportedError('vision', 'openai-gpt3');
    expect(error.message).toBe('Capability "vision" not supported by backend "openai-gpt3"');
    expect(error.code).toBe(ACPErrorCode.CapabilityUnsupported);
    expect(error.name).toBe('CapabilityUnsupportedError');
    expect(error.data).toEqual({ capability: 'vision', backend: 'openai-gpt3' });
  });
});

describe('RateLimitError', () => {
  it('should create error with backend name', () => {
    const error = new RateLimitError('anthropic');
    expect(error.message).toBe('Rate limit exceeded for backend "anthropic"');
    expect(error.code).toBe(ACPErrorCode.RateLimited);
    expect(error.name).toBe('RateLimitError');
    expect(error.data).toEqual({ backend: 'anthropic', retryAfterMs: undefined });
  });

  it('should include retryAfterMs when provided', () => {
    const error = new RateLimitError('anthropic', 60000);
    expect(error.data).toEqual({ backend: 'anthropic', retryAfterMs: 60000 });
  });
});

describe('ContextExceededError', () => {
  it('should create error with token counts', () => {
    const error = new ContextExceededError('anthropic', 150000, 128000);
    expect(error.message).toBe('Context window exceeded for backend "anthropic"');
    expect(error.code).toBe(ACPErrorCode.ContextExceeded);
    expect(error.name).toBe('ContextExceededError');
    expect(error.data).toEqual({
      backend: 'anthropic',
      tokenCount: 150000,
      maxTokens: 128000,
    });
  });
});

describe('AuthenticationError', () => {
  it('should create error with backend name', () => {
    const error = new AuthenticationError('openai');
    expect(error.message).toBe('Authentication failed for backend "openai"');
    expect(error.code).toBe(ACPErrorCode.AuthFailed);
    expect(error.name).toBe('AuthenticationError');
    expect(error.data).toEqual({ backend: 'openai' });
  });
});

describe('ParseError', () => {
  it('should create error without cause', () => {
    const error = new ParseError();
    expect(error.message).toBe('Failed to parse request');
    expect(error.code).toBe(ACPErrorCode.ParseError);
    expect(error.name).toBe('ParseError');
    expect(error.data).toEqual({ cause: undefined });
  });

  it('should include cause when provided', () => {
    const cause = new Error('Unexpected token');
    const error = new ParseError(cause);
    expect(error.data).toEqual({ cause: 'Unexpected token' });
  });
});

describe('InvalidRequestError', () => {
  it('should create error with reason', () => {
    const error = new InvalidRequestError('Missing method');
    expect(error.message).toBe('Invalid request: Missing method');
    expect(error.code).toBe(ACPErrorCode.InvalidRequest);
    expect(error.name).toBe('InvalidRequestError');
    expect(error.data).toEqual({ reason: 'Missing method' });
  });
});

describe('MethodNotFoundError', () => {
  it('should create error with method name', () => {
    const error = new MethodNotFoundError('acp/unknown/method');
    expect(error.message).toBe('Method not found: acp/unknown/method');
    expect(error.code).toBe(ACPErrorCode.MethodNotFound);
    expect(error.name).toBe('MethodNotFoundError');
    expect(error.data).toEqual({ method: 'acp/unknown/method' });
  });
});

describe('InvalidParamsError', () => {
  it('should create error with reason', () => {
    const error = new InvalidParamsError('model is required');
    expect(error.message).toBe('Invalid parameters: model is required');
    expect(error.code).toBe(ACPErrorCode.InvalidParams);
    expect(error.name).toBe('InvalidParamsError');
    expect(error.data).toEqual({ reason: 'model is required' });
  });
});

describe('InternalError', () => {
  it('should create error with message', () => {
    const error = new InternalError('Unexpected failure');
    expect(error.message).toBe('Unexpected failure');
    expect(error.code).toBe(ACPErrorCode.InternalError);
    expect(error.name).toBe('InternalError');
    expect(error.data).toEqual({ cause: undefined });
  });

  it('should include cause when provided', () => {
    const cause = new Error('Database connection failed');
    const error = new InternalError('Unexpected failure', cause);
    expect(error.data).toEqual({ cause: 'Database connection failed' });
  });
});
