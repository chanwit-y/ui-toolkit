import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import { engineDebug } from "../core/engineDebug";

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

	// Mirror into the engine debug store so an inspector outside this provider
	// (the tree `Provider isRoot` builds is closed to siblings) can subscribe.
	const debugId = useId();
	useEffect(() => {
		engineDebug.setContextData(debugId, contextData);
	}, [debugId, contextData]);
	useEffect(() => () => engineDebug.setContextData(debugId, undefined), [debugId]);

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