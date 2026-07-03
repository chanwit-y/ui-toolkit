import { create } from 'zustand'

export type TestInputKey = 'query' | 'parameter' | 'body'
export type TestInputs = Partial<Record<TestInputKey, string>>

type ApiTestStore = {
  /** Raw JSON input text per endpoint id — runtime-only, never exported. An
   * absent key means "use the generated model skeleton". */
  inputs: Record<string, TestInputs>

  setInput: (endpointId: string, key: TestInputKey, value: string) => void
  /** Drop the stored texts so the inputs re-seed from the current models. */
  resetInputs: (endpointId: string) => void
}

/**
 * Test-run inputs survive switching endpoints/pages (see the grilled design)
 * but are deliberately not part of any export — they're scratch data for the
 * runner, not config.
 */
export const useApiTestStore = create<ApiTestStore>((set) => ({
  inputs: {},

  setInput: (endpointId, key, value) =>
    set((s) => ({
      inputs: {
        ...s.inputs,
        [endpointId]: { ...s.inputs[endpointId], [key]: value },
      },
    })),

  resetInputs: (endpointId) =>
    set((s) => {
      const next = { ...s.inputs }
      delete next[endpointId]
      return { inputs: next }
    }),
}))
