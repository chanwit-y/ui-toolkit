
import type { IAuthContext } from "../@types";
import { createContext, Fragment, useCallback, useContext, useMemo, useState, type ComponentType, type Context, type ReactNode } from "react";
import {
	AuthenticatedTemplate,
	MsalProvider,
	UnauthenticatedTemplate,
	useMsal,
} from '@azure/msal-react';
import msalInstance from "./MsalInstance";

export type IAzureContext<T> = IAuthContext<T> & {}

export type AzureAuthContext = <T>() => Context<IAzureContext<T>>;

export type AzureProps<T> = {
	children: ReactNode;
	context: Context<IAzureContext<T>>;
	url?: string;
	error500Page?: ReactNode;
	landingPage?: ComponentType<{ onSignin: () => Promise<void> }>;
};

export const createAuthContext: AzureAuthContext = <T extends any>() =>
	createContext<IAzureContext<T>>({} as IAzureContext<T>);

const AzureProvider = <T extends any>({
	children,
	context,
}: AzureProps<T>) => {

	const { instance, accounts } = useMsal();

	const [userInfo, setUserInfo] = useState<any>();

	const username = useMemo(() => {
		return accounts && accounts.length !== 0
			? accounts[0].username
			: ""
	}, [accounts]);

	const login = useCallback(() => {
		instance.loginRedirect();
	}, [instance]);

	const logout = useCallback(() => {
		instance.logout();
	}, [instance]);

	return <context.Provider value={{
		login,
		logout,
		userInfo: userInfo?.data,
		username,
		updateUserInfo: setUserInfo,
	}}>
		<Fragment>
			<AuthenticatedTemplate>
				{children}
			</AuthenticatedTemplate>
			<UnauthenticatedTemplate>
				<div className="flex items-center justify-center h-screen">
					<button onClick={login}>Login</button>
				</div>
			</UnauthenticatedTemplate>
		</Fragment>
	</context.Provider>
}


export const getAzureAuthProvider = <T extends any>(
	context: Context<IAzureContext<T>>,
) => {
	const useAuth = () => useContext(context);
	const AuthProvider = ({
		children,
		context,
		url,
		landingPage
	}: AzureProps<T>) => (
		<MsalProvider instance={msalInstance}>
			<AzureProvider<T>
				context={context}
				url={url}
				landingPage={landingPage}
			>
				{children}
			</AzureProvider>
		</MsalProvider >
	);

return { AuthProvider, useAuth };
};