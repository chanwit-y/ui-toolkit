import {  createAuthContext, getAzureAuthProvider } from "./azure";
// import { AuthProvider, useAuth } from "../../config/Auth";

export const azureCtx = createAuthContext<any>();
export const { AuthProvider: AzureAuthProvider, useAuth: useAzureAuth } = getAzureAuthProvider(azureCtx);
// export {AuthProvider as AzureAuthProvider, useAuth as useAzureAuth}

