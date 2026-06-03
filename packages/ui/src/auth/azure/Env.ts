// Define type of environments
interface IProcessEnv {
  VITE_API_URL: string;
  VITE_TENANT_ID: string;
  VITE_CLIENT_ID: string;
  VITE_REDIRECT_URL: string;
  VITE_API_SCOPE: string;
}

// declare const process: any

declare namespace process {
  let env: IProcessEnv;
}

type IEnv = {
  VITE_API_URL: string;
  VITE_TENANT_ID: string;
  VITE_CLIENT_ID: string;
  VITE_REDIRECT_URL: string;
  VITE_API_SCOPE: string;
};

let envSource: IProcessEnv & IEnv;

if ((import.meta as any).env !== undefined) {
  envSource = (import.meta as any).env as IEnv;
} else {
  envSource = process.env;
}

if ((window as any)._env != null) {
  envSource = (window as any)._env as IEnv;
}

/* Get constants from environment variables.
 * Values are configured in .env (for development) and .env.production (for staging and production)
 */

const { VITE_API_URL, VITE_TENANT_ID, VITE_CLIENT_ID, VITE_REDIRECT_URL, VITE_API_SCOPE } =
  envSource;

export const Env = {
  API_URL: VITE_API_URL ?? "",
  CLIENT_ID: VITE_CLIENT_ID ?? "",
  TENANT_ID: VITE_TENANT_ID ?? "",
  REDIRECT_URL: VITE_REDIRECT_URL ?? "",
  API_SCOPE: VITE_API_SCOPE ?? "",
};
