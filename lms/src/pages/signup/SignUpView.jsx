import {useState, useRef, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {Icon} from '@iconify/react';
import {useTranslation} from 'react-i18next';  //Used for multi-language


export default function SignUpView() {
  const navigate = useNavigate();
  const [inputUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [emailid, setEmail] = useState('');
  const [passwordfield, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inputLevel] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const API_DOMAIN = import.meta.env.VITE_SIGNUP_API_DOMAIN_NAME;
  const [, setIsVerificationButtonDisabled] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [nicknameError, setNicknameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [, setVerificationError] = useState('');
  
  //used for multi-language
  const {t} = useTranslation("auth");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!showOtpScreen) {
      // If validation fails, the browser will show errors and this function won't run.
      // If we get here, the required fields are valid.
      console.log("Step 1 validated, moving to OTP screen");
      setShowOtpScreen(true);
      return; // Do not perform final submission yet.
    }
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_DOMAIN}/register`, {
        username: nickname,
        email: emailid,
        password: passwordfield,
        role: 'USER',
        level: 'STUDENT',
        name: nickname,
        invitation: invitationCode,
        verification: verificationCode
      });
      console.log(inputUsername,
        emailid,
        passwordfield,
        inputLevel,
        nickname,
        invitationCode,
        verificationCode)
      
      console.log("regiter response", response)
      if (response.data.msg === 'Invitation Not Exist') {
        alert(t("signupErrors.invitationNotExist"));
        setSuccess('');
      } else if (response.data.msg === 'Success') {
        setError('');
        
        setTimeout(() => {
          window.alert(t("signupErrors.signupSuccess"));
          navigate('/login');
        }, 1500);
      } else if (response.data?.msg) {
        alert(response.data.msg, t("signupErrors.tryAgain"));
        setSuccess('');
      } else {
        alert(t("signupErrors.signupFailed"));
        setSuccess('');
      }
    } catch (err) {
      console.error(err);
      alert(t("signupErrors.signupFailed"));
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (setter) => (e) => {
    setter(e.target.value);
  };
  
  const handleRequestVerificationCode = async () => {
    if (!isValidEmail(emailid)) {
      setError(t("signupErrors.emailInvalid"));
      return;
    }
    
    try {
      setVerificationCode('')
      setLoading(true);
      const formData = new FormData();
      formData.append('email', emailid);
      
      const response = await axios.post(`${API_DOMAIN}/sendRegisterEmailVerification`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log("Hi,", response);
      setCountdown(60);
      if (response.data.code === "200") {
        setSuccess(t("signupErrors.verificationCodeSent"));
        setIsVerificationButtonDisabled(true);
        // Start 60 second countdown
        setError(''); // Clear any existing errors
      } else if (response.data.code === "4020") {
        setError(t("signupErrors.emailExists"));
        setSuccess('');
      }
    } catch (err) {
      setError(err.response?.data?.message || t("signupErrors.sendVerificationFailed"));
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };
  
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setIsVerificationButtonDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown]);
  const handleContinue = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_DOMAIN}/validateRegisterEmailVerification`, null, {
        params: {
          email: emailid,
          code: verificationCode,
        },
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.msg === 'Success') {
        setShowOtpScreen(true)
      } else {
        setError(response.data.msg || t("signupErrors.verificationFailed"));
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(t("signupErrors.generic"));
    } finally {
      setLoading(false);
    }
  };
  
  // Update input handlers to clear only their specific error
  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
    setNicknameError('');
  };
  
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError('');
  };
  
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError('');
  };
  
  const handleVerificationChange = (e) => {
    setVerificationCode(e.target.value);
    setVerificationError('');
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 px-4">
      <div className="w-full max-w-[1500px] grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 rounded-xl overflow-hidden">
        {/* Left Section */}
        <div className="sp-2 flex flex-col items-center justify-center">
          <img src="/icons/login/login-img.png" alt="Coursistant UI"
               className="w-full h-[95%] object-cover rounded-2xl"/>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center justify-center p-8 ml-[14%] w-[512px]">
          <div className="w-full">
            <form onSubmit={handleSubmit}>
              {!showOtpScreen ? (
                <>
                  <div className="flex flex-col items-start justify-center">
                    <h2 className="text-4xl mt-2 font-900 mb-4">
                      {t("signup.title")}
                    </h2>
                    <p className="text-sm text-[#718096] mb-10">
                      {t("signup.subtitle")}
                    </p>
                  </div>
                  
                  {/* No social sign-up. V1 has no OAuth contract and the auth
                      module exposes no social endpoint — these led to
                      /thirdParty/*, which this backend does not serve. The
                      divider went too: it only separated them from the form. */}
                  <div className="space-y-6">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t("signup.nicknamePlaceholder")}
                        value={nickname}
                        onChange={handleNicknameChange}
                        required
                        className="w-full px-4 py-3 rounded-[10px] bg-white border border-gray-300 text-gray-900 text-sm focus:border-[#566FE8] focus:outline-none"
                      />
                      {nicknameError && <p className="text-red-500 text-xs mt-1 text-right">{nicknameError}</p>}
                    </div>
                    
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder={t("signup.emailPlaceholder")}
                        value={emailid}
                        onChange={handleEmailChange}
                        className="w-full px-4 py-3 rounded-[10px] bg-white border border-gray-300 text-gray-900 text-sm focus:border-[#566FE8] focus:outline-none"
                      />
                      {emailError && <p className="text-red-500 text-xs mt-1 text-right">{emailError}</p>}
                    </div>
                    
                    <div className="relative">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t("signup.passwordPlaceholder")}
                          value={passwordfield}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-3 rounded-[10px] bg-white border border-gray-300 text-gray-900 text-sm focus:border-[#566FE8] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          <Icon icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={20} height={20}/>
                        </button>
                      </div>
                      {passwordError && <p className="text-red-500 text-xs mt-1 text-right">{passwordError}</p>}
                    </div>
                    
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t("signup.verificationPlaceholder")}
                          value={verificationCode}
                          onChange={handleVerificationChange}
                          className="w-full px-4 py-3 rounded-[10px] bg-white border border-gray-300 text-gray-900 text-sm focus:border-[#566FE8] focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleRequestVerificationCode}
                          disabled={!isValidEmail(emailid) || countdown > 0}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566FE8] text-xs font-medium disabled:opacity-50 cursor-pointer"
                        >
                          {countdown > 0
                            ? t("signup.verifyTime", {time: formatTime(countdown)})
                            : t("signup.verifyEmail")}
                        
                        </button>
                      </div>
                      {error && <p className="text-red-500 text-xs mt-1 text-right">{error}</p>}
                      {success && <p className="text-green-500 text-xs mt-1 text-right">{success}</p>}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    className="w-full py-3 rounded-[15px] bg-[#566FE8] hover:bg-[#7F9CF5] text-white text-sm mt-8 cursor-pointer"
                    disabled={loading}
                    onClick={handleContinue}
                  >
                    {loading ? t("signup.loading") : t("signup.continueButton")}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowOtpScreen(false);
                    }}
                    className="block mb-5 text-gray-500 hover:text-gray-700"
                  >
                    {t("signup.backLink")}
                  </a>
                  
                  <div className="flex flex-col items-start justify-center">
                    <h2 className="text-4xl mt-2 font-900 mb-4">
                      {t("signup.title")}
                    </h2>
                    <p className="text-sm text-[#718096] mb-3">
                      {t("signup.invitationSubtitle")}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder={t("signup.invitationPlaceholder")}
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      required
                      className="w-full px-4 mb-100 mt-5 py-3 rounded-[15px] bg-white border border-gray-300 text-gray-900 text-sm focus:border-[#566FE8] focus:outline-none"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 mt-10 rounded-[15px] bg-[#566FE8] hover:bg-[#7F9CF5] text-white text-sm cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? t("signup.loading") : t("signup.completeSignupButton")}
                  </button>
                </>
              )}
            </form>
            
            <p className="text-sm text-center mt-6 mb-5">
              {t("signup.alreadyRegistered")}
              <a href="/login" className="text-[#566FE8] ml-1 hover:underline">
                {t("signup.signinLink")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
