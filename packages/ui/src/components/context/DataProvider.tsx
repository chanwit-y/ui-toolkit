import { createContext, useCallback, useContext, useState } from "react";

export type DataContextType = {
	fnCtxs: Record<string, Function>,
	contextData: Record<string, any>,
	updateFnCtxs: (key: string, fn: Function) => void
	updateContextData: (name: string, selectedRow: Record<string, any>) => void,
	clearCurrentFormSelected: () => void,
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
	const [contextData, setContextData] = useState<Record<string, any>>({});
	const [fnCtxs, setFnCtxs] = useState<Record<string, Function>>({});

	const updateFnCtxs = useCallback((key: string, fn: Function) => {
		setFnCtxs((prev) => ({ ...prev, [key]: fn }));
	}, []);
	const updateContextData = useCallback((name: string, selectedRow: Record<string, any>) => {
		setContextData((prev) => ({ ...prev, [name]: selectedRow }));
	}, []);
	const clearCurrentFormSelected = useCallback(() => {
		setContextData({});
	}, []);

	return <DataContext.Provider value={{ fnCtxs, contextData, updateFnCtxs, updateContextData, clearCurrentFormSelected }}>
		{/* {JSON.stringify(contextData, undefined, 2)} */}
		{children}
	</DataContext.Provider>
}

export const useData = () => {
	const context = useContext(DataContext);
	if (context === null) {
		throw new Error('useData must be used within a DataProvider');
	}
	return context;
};