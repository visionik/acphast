/**
 * Anthropic Node Pipeline
 * 
 * Disaggregated nodes for Anthropic integration:
 * - AnthropicTranslatorNode: ACP → Anthropic format
 * - AnthropicClientNode: Calls Anthropic API with streaming
 * - ResponseNormalizerNode: Anthropic response → ACP format
 */

export * from './translator.js';
export * from './client.js';
export * from './normalizer.js';
