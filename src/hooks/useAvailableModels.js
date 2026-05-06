import { useMemo, useRef } from 'react'

const defaultModelsMap = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  claude: [
    'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest',
    'claude-3-opus-latest', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
  ],
  siliconflow: [
    'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', 'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-Coder-7B-Instruct', 'internlm/internlm2_5-7b-chat',
    'meta-llama/Meta-Llama-3.1-8B-Instruct', 'THUDM/glm-4-9b-chat'
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openrouter: [
    'google/gemini-2.0-flash-thinking-exp:free', 'deepseek/deepseek-chat:free',
    'google/gemini-2.0-pro-exp-02-05:free', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'
  ],
  stepfun: ['step-2-16k', 'step-1-8k', 'step-1-32k', 'step-1-128k']
}

const fallbackModels = [
  'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo',
  'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
]

export default function useAvailableModels(availableModels, selectedProvider) {
  const initializedRef = useRef(false)
  const lastProviderRef = useRef(null)

  return useMemo(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      lastProviderRef.current = selectedProvider
    }

    const providerChanged = selectedProvider !== lastProviderRef.current
    if (providerChanged) lastProviderRef.current = selectedProvider

    if (availableModels && availableModels.length > 0) {
      try {
        localStorage.setItem(`aichat_available_models_${selectedProvider}`, JSON.stringify(availableModels))
      } catch {}
      return availableModels
    }

    if (providerChanged || !availableModels || availableModels.length === 0) {
      try {
        const saved = localStorage.getItem(`aichat_available_models_${selectedProvider}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
      return defaultModelsMap[selectedProvider] || fallbackModels
    }

    return []
  }, [availableModels, selectedProvider])
}
