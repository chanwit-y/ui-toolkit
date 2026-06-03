// import { create } from "zustand";

import { create } from "zustand";

type LoadDataTables = {
  fnCtxs: Record<string, Function>,
  updateFnCtxs: (key: string, fn: Function) => void

  // contextData: Record<string, any>,
  // updateContextData: (name: string, selectedRow: Record<string, any>) => void,
  // clearCurrentFormSelected: () => void,
}

export const useStord = create<LoadDataTables>((set) => ({
  fnCtxs: {} as Record<string, Function>,
  updateFnCtxs: (key: string, fn: Function) => set((state: LoadDataTables) => ({ fnCtxs: {   ...state.fnCtxs, [key]: fn } })),

  // contextData: {} as Record<string, any>,
  // updateContextData: (name: string, selectedRow: Record<string, any>) => set((state) => ({ contextData: { ...state.contextData, [name]: selectedRow } })),
  // clearCurrentFormSelected: () => set(() => ({ contextData: {} })),
}));

// export  type DataState = {
//   count: number;
//   inc: () => void;
// };

// export const useCount = create<DataState>((set) => ({
//   count: 1,
//   inc: () => set((state) => ({ count: state.count + 1 })),
// }));
