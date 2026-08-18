import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Icon} from '@iconify/react';
import {useAuth} from "@/contexts/AuthContext";
import {useTranslation} from 'react-i18next';
import {ApiError, AUTH_ERROR_CODES, V2ApiClient} from "@/apis";
import {authApiService} from "@/apis/services/auth-api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const getFieldError = (field: string) => fieldErrors[field] || '';
  const [rememberMe, setRememberMe] = useState(false);
  const {login} = useAuth();
  
  const navigate = useNavigate();
  const {t} = useTranslation("auth");
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent<any>) => {
      if (event.data && event.data.redirectUrl) {
        navigate(event.data.redirectUrl);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);
  
  useEffect(() => {
    const savedAccount = localStorage.getItem('account');
    if (savedAccount) {
      const parsedAccount = JSON.parse(savedAccount);
      const accessToken = localStorage.getItem('accToken');
      if (parsedAccount.token && accessToken !== null) {
        V2ApiClient.setAccessToken(accessToken);
        navigate('/');
      }
    }
  }, [navigate]);
  
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    try {
      // `role` is fixed to USER: it picks the account table, and the design has
      // no role selector. Tenant and system admins sign in elsewhere.
      // See open-decisions.md Q-15.
      const response = await authApiService.login({email, password, role: 'USER'});

      if (response.status === 200 && response.data) {
        const auth = response.data;

        // Managed users (every instructor, since ops creates those accounts)
        // land here on first login, and the backend then 403s every business
        // API until the password changes. There is no screen for this yet —
        // open-decisions.md Q-16 — so refuse the session rather than drop the
        // user into an app where nothing works.
        if (auth.mustChangePassword) {
          setFieldErrors({password: t("errors.passwordChangeRequired")});
          return;
        }

        login({...auth, id: auth.userId});
        V2ApiClient.setAccessToken(auth.accessToken);
        localStorage.setItem('accToken', auth.accessToken);
        navigate('/');
        return;
      }

      setFieldErrors({password: t("errors.unexpected")});
    } catch (err) {
      // The API answers wrong password, unknown account and locked-out all as
      // INVALID_CREDENTIALS on purpose (NFR-15). Do not try to tell the user
      // which one it was — the frontend cannot know, and guessing would leak
      // whether an account exists.
      const code = (err as ApiError)?.details?.code;

      if (code === AUTH_ERROR_CODES.invalidCredentials) {
        setFieldErrors({password: t("errors.invalidCredentials")});
      } else if (code === AUTH_ERROR_CODES.serviceUnavailable) {
        setFieldErrors({password: t("errors.serviceUnavailable")});
      } else {
        console.error('Login failed', err);
        setFieldErrors({password: t("errors.unexpected")});
      }
    }
  };
  
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white text-gray-900 px-4 overflow-auto">
      <div className="w-full max-w-[1500px] grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 rounded-xl">
        {/* Left side image */}
        <div className="sp-2 flex flex-col items-center justify-center">
          <img src="/icons/login/login-img.png" alt="Coursistant UI"
               className="w-full h-[95%] object-cover rounded-2xl"/>
        </div>
        
        {/* Right side form */}
        <div className="mx-auto flex flex-col justify-center min-h-[600px] w-[512px]">
          <h2 className="text-3xl sm:text-4xl mb-6 text-gray-800">
            {t("login.title")}
          </h2>
          <p className="text-sm text-[#718096] mb-12">
            {t("login.subtitle")}
          </p>
          
          {/* No social sign-in. There is no OAuth contract in V1 and the auth
              module has no social endpoint — these buttons led to
              /thirdParty/*, which this backend does not serve, so every one of
              them was a dead end. The divider went with them: it only existed
              to separate them from the email form below. */}
          
          <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              className={`w-full px-4 py-3 rounded-lg bg-white border text-gray-900 text-sm focus:outline-none mb-6 ${getFieldError('email') ? 'border-red-500' : 'border-gray-300 focus:border-[#566FE8]'
              }`}
              required
            />
            {getFieldError('email') && (
              <p className="text-red-400 text-[12px] text-right mt-[-20px]">{getFieldError('email')}</p>
            )}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                className={`w-full px-4 py-3 rounded-lg bg-white border text-gray-900 text-sm focus:outline-none ${getFieldError('password') ? 'border-red-500' : 'border-gray-300 focus:border-[#566FE8]'}`}
                required
              />
              
              <div className="absolute inset-y-0 right-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <Icon icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={20} height={20}/>
                </button>
              </div>
            </div>
            {getFieldError('password') && (
              <p className="text-red-400 text-[12px] text-right mt-[-0.75rem] mb-6">{getFieldError('password')}</p>
            )}
            
            <div className="flex flex-wrap items-center justify-between text-sm gap-2">
              <label className="flex items-center text-[#A0AEC0]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 border-[#A0AEC0] rounded accent-[#566FE8] cursor-pointer"
                />
                {t("login.rememberForDays")}
              </label>
              <a href="/forgotpassword" className=" text-[14px] text-[#566FE8] text-sm hover:underline">
                {t("login.forgotPassword")}
              </a>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#566FE8] hover:bg-[#7F9CF5] text-white text-sm mt-8 cursor-pointer"
            >
              {t("login.logIn")}
            </button>
          </form>
          
          <p className="text-sm text-center mt-6">
            {t("login.noAccount")}
            <a href="/signup" className="text-[#566FE8] text-sm ml-1"
               onClick={(event) => {
                 event.preventDefault();
                 navigate('/signup');
               }}>{t("login.signUp")}</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;