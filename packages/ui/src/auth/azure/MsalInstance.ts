import {
  PublicClientApplication,
  type Configuration,
  type SilentRequest,
} from '@azure/msal-browser';
import { Env } from './Env';
import { isIEorEdge } from './VersionBrowser';


export const LOGIN_MICROSOFTONLINE_URL = "https://login.microsoftonline.com/";

const config: Configuration = {
  auth: {
    authority: `${LOGIN_MICROSOFTONLINE_URL}${Env.TENANT_ID}`,
    clientId: Env.CLIENT_ID,
    redirectUri: Env.REDIRECT_URL,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: isIEorEdge() > 0,
  },
};

const msalInstance = new PublicClientApplication(config);
export const getAccessToken = async () => {

  let token = '';

    const accounts = await msalInstance.getAllAccounts();

    if (accounts.length > 0) {
      const silentRequest: SilentRequest = {
        account: accounts[0],
        scopes: [Env.API_SCOPE],
      };
      const acquireToken = await msalInstance.acquireTokenSilent(silentRequest);
      token = acquireToken.accessToken;
    }
  // }

  return token;
};

export const getEmail = async () => {
  let email = '';
  const accounts = await msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    email = accounts[0].username; // username is email
  }
  return email;
};

export default msalInstance;
