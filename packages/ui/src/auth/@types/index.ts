
export interface IAuthContext<T extends any> {
  username?: string;
  userInfo?: T;
  updateUserInfo: (u: T) => void;
  login: (u: string, p: string) => void;
  logout: () => void;
  //   isAuthenticated: boolean;
  //   isLoading: boolean;
  //   error: string | null;
  //   setError: (error: string | null) => void;
  //   setIsLoading: (isLoading: boolean) => void;
  //   setIsAuthenticated: (isAuthenticated: boolean) => void;
  //   setUserProfile: (userProfile: T) => void;
  //   setUsername: (username: string) => void;
}
