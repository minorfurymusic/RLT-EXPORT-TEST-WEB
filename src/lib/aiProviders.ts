import { safeLocalStorage } from './utils';

/**
 * Provider-agnostic AI configuration. "openai-compat" covers every provider that
 * speaks the OpenAI Chat Completions request/response shape (OpenAI itself,
 * DeepSeek, Kimi/Moonshot, Gemini via Google's OpenAI-compatibility endpoint, and
 * any other provider a user points "Personalizado" at) — that's the vast majority
 * of the ecosystem today, so one HTTP adapter covers all of them. Anthropic's
 * Messages API has a different enough shape (system param, content blocks,
 * tool_use blocks) to need its own adapter.
 */
export type AIProviderKind = 'openai-compat' | 'anthropic';

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'custom';

export interface AIProviderPreset {
  id: AIProviderId;
  label: string;
  kind: AIProviderKind;
  baseUrl: string;
  defaultModel: string;
  /** tried once, automatically, if defaultModel comes back "not found" / deprecated — providers retire model names over time */
  fallbackModel?: string;
  keyHint: string;
  keyDocsUrl?: string;
  /** true when baseUrl/model should be freely editable in the UI (Gemini/OpenAI/etc have sane fixed defaults) */
  editableEndpoint?: boolean;
}

export const AI_PROVIDER_PRESETS: Record<AIProviderId, AIProviderPreset> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'openai-compat',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-flash-latest',
    keyHint: 'AIzaSy... ou AQ...',
    keyDocsUrl: 'https://aistudio.google.com/app/apikey'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'sk-...',
    keyDocsUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-5',
    keyHint: 'sk-ant-...',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys'
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai-compat',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    keyHint: 'sk-...',
    keyDocsUrl: 'https://platform.deepseek.com/api_keys'
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi (Moonshot AI)',
    kind: 'openai-compat',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2-turbo-preview',
    keyHint: 'sk-...',
    keyDocsUrl: 'https://platform.moonshot.ai/console/api-keys'
  },
  custom: {
    id: 'custom',
    label: 'Personalizado (compatível com OpenAI)',
    kind: 'openai-compat',
    baseUrl: '',
    defaultModel: '',
    keyHint: 'sua chave',
    editableEndpoint: true
  }
};

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey: string;
  /** only meaningful (and editable) for provider: 'custom' */
  baseUrl?: string;
  /** overrides the preset's defaultModel when set */
  model?: string;
}

const STORAGE_KEY = 'ai_provider_config';
const LEGACY_GEMINI_KEY = 'gemini_api_key';

export function loadAIProviderConfig(): AIProviderConfig | null {
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.apiKey === 'string' && typeof parsed.provider === 'string') {
        return parsed;
      }
    } catch {
      // fall through to legacy migration below
    }
  }

  // Migrate a pre-existing personal Gemini key from before multi-provider support.
  const legacyKey = safeLocalStorage.getItem(LEGACY_GEMINI_KEY);
  if (legacyKey && legacyKey.trim()) {
    const migrated: AIProviderConfig = { provider: 'gemini', apiKey: legacyKey.trim() };
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    safeLocalStorage.removeItem(LEGACY_GEMINI_KEY);
    return migrated;
  }

  return null;
}

export function saveAIProviderConfig(config: AIProviderConfig | null): void {
  if (config && config.apiKey.trim()) {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, apiKey: config.apiKey.trim() }));
  } else {
    safeLocalStorage.removeItem(STORAGE_KEY);
  }
}

export function resolveEndpoint(config: AIProviderConfig): { kind: AIProviderKind; baseUrl: string; model: string } {
  const preset = AI_PROVIDER_PRESETS[config.provider] || AI_PROVIDER_PRESETS.custom;
  return {
    kind: preset.kind,
    baseUrl: (config.baseUrl && config.baseUrl.trim()) || preset.baseUrl,
    model: (config.model && config.model.trim()) || preset.defaultModel
  };
}
