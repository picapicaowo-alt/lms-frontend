import {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {LoginResponse, V2ApiClient} from "@/apis";
import {authApiService} from "@/apis/services/auth-api";

interface AuthContextValue {
  user: LoginResponse | null;
  login: (userData: LoginResponse) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({children}: AuthProviderProps) => {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);
  
  const clearRocketChatCookies = () => {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      
      if (cookieName.startsWith('rc_') ||
        cookieName === 'rc_token' ||
        cookieName === 'rc_uid' ||
        cookieName === 'rc_room_type') {
        
        const domains = ['', '.xlearnedu.com', '.dev.chat.xlearnedu.com', 'dev.chat.xlearnedu.com'];
        const paths = ['/', '/home', '/api'];
        
        domains.forEach(domain => {
          paths.forEach(path => {
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}${domain ? `;domain=${domain}` : ''}`;
          });
        });
      }
    });
  };
  
  const login = (userData: LoginResponse) => {
    const storedUser = localStorage.getItem('user');
    const previousEmail = storedUser ? (JSON.parse(storedUser) as LoginResponse).email : null;
    const newEmail = userData.email;
    
    if (previousEmail && previousEmail !== newEmail) {
      clearRocketChatCookies();
    }
    
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };
  
  /**
   * Ends the session on the server as well as in this tab.
   *
   * Clearing localStorage only discards the access token. The refresh token
   * lives in an HttpOnly cookie the browser keeps sending, and it is good for
   * about two weeks — so without calling the endpoint the session survived
   * "logging out" and could be resumed. The call is allowed without a bearer
   * token precisely because the cookie identifies the session.
   *
   * The local side happens regardless of the result: a user who asked to log
   * out must not be left signed in because the network failed.
   */
  const logout = async () => {
    const rocketChatIframe = document.querySelector('iframe[title="RocketChat"]') as HTMLIFrameElement | null;

    if (rocketChatIframe?.contentWindow) {
      try {
        rocketChatIframe.contentWindow.postMessage({
          event: 'call-api',
          method: 'logout'
        }, 'https://dev.chat.xlearnedu.com');
      } catch {
        // Ignored
      }
    }

    try {
      await authApiService.logout();
    } catch (error) {
      console.error('Server logout failed; clearing the local session anyway', error);
    }

    V2ApiClient.clearAccessToken();
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };
  
  return (
    <AuthContext.Provider value={{user, login, logout, loading}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};