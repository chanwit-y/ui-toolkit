import type { DataValue } from "../@types";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Subject } from "rxjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { LoadingProvider } from "../context";
import { SnackbarProvider } from "../Snackbar";
import { AzureAuthProvider, azureCtx } from "../../auth";
// import { DataProvider } from "./dataContext";
// import { useStord } from "./stord";

type CoreContextType = {
	observeTable: Record<string, any>;
	addObserveTable: (key: string) => void;
	getObserveTable: (dv: DataValue) => Subject<unknown> | undefined

	// fnCtxs: Record<string, Function>,
	// contextData: Record<string, any>,
	// updateFnCtxs: (key: string, fn: Function) => void

	// updateContextData: (name: string, selectedRow: Record<string, any>) => void,
	// clearCurrentFormSelected: () => void,
}

const Context = createContext<CoreContextType>({} as CoreContextType);

type CoreProviderProps = {
	children: ReactNode;
	isRoot?: boolean;
	withAuth?: boolean;
}

const queryClient = new QueryClient()

export const Provider = ({ children, isRoot = false, withAuth = false }: CoreProviderProps) => {

	// const [contextData, setContextData] = useState<Record<string, any>>({});
	// const [fnCtxs, setFnCtxs] = useState<Record<string, Function>>({});

	const [observeTable, setObserveTable] = useState<Record<string, Subject<unknown>>>({});
	const addObserveTable = useCallback((key: string) => {
		setObserveTable((prev) => ({ ...prev, [key]: new Subject<unknown>() }));
	}, []);


	// const updateFnCtxs = useCallback((key: string, fn: Function) => {
	// 	setFnCtxs((prev) => ({ ...prev, [key]: fn }));
	// }, []);
	// const updateContextData = useCallback((name: string, selectedRow: Record<string, any>) => {
	// 	setContextData((prev) => ({ ...prev, [name]: selectedRow }));
	// }, []);
	// const clearCurrentFormSelected = useCallback(() => {
	// 	setContextData({});
	// }, []);

	const getObserveTable = useCallback((dv: DataValue) => {
		switch (dv.type) {
			case "observe":
				return observeTable[dv.key]
			default:
				return undefined
		}
	}, [observeTable]);

	return isRoot ?
		(
			<Context.Provider value={{ observeTable, addObserveTable, getObserveTable }}>
				{/* <DataProvider> */}
					<LoadingProvider>
						<SnackbarProvider>
							<QueryClientProvider client={queryClient}>
								{withAuth ? <AzureAuthProvider context={azureCtx}>
									{children}
								</AzureAuthProvider> : children}
								<ReactQueryDevtools initialIsOpen={false} />
							</QueryClientProvider>
						</SnackbarProvider>
					</LoadingProvider>
				{/* </DataProvider> */}
			</Context.Provider>
		) : children
};

export const useCore = () => {
	const context = useContext(Context);
	if (!context) {
		throw new Error('usePage must be used within a PageProvider');
	}
	return context;
};