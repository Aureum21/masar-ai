"use client";
import {createContext, useContext, useEffect, useState, useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {APP_HOME} from '@/config/navigation';
import {apiRequest} from '@/lib/api';
import {readStored, storeAuth, subscribeAuth} from '@/lib/authStore';
import {useHydrated} from '@/hooks/useHydrated';
const AuthContext = createContext(null);
const tokenSnapshot = () => readStored('masar_token');
const emailSnapshot = () => readStored('masar_user_email');
const serverSnapshot = () => null;
export function AuthProvider({children}) {
  const token = useSyncExternalStore(subscribeAuth, tokenSnapshot, serverSnapshot);
  const userEmail = useSyncExternalStore(subscribeAuth, emailSnapshot, serverSnapshot);
  const hydrated = useHydrated();
  const [profile, setProfile] = useState({token:null, user:null, error:null});
  const router = useRouter();
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    apiRequest('/api/v1/users/me', {token, signal:controller.signal}).then(user => {
      if (!controller.signal.aborted) setProfile({token,user,error:null});
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.status === 401) storeAuth(null,null);
      setProfile({token,user:null,error:error.message});
    });
    return () => controller.abort();
  }, [token]);
  const user = token && profile.token === token ? profile.user : null;
  const profileError = token && profile.token === token ? profile.error : null;
  const loading = !hydrated || Boolean(token && profile.token !== token);
  async function login(email,password,redirectPath=APP_HOME) {
    const data=await apiRequest('/api/v1/auth/login', {method:'POST',body:new URLSearchParams({username:email,password})});
    storeAuth(data.access_token,email); router.push(redirectPath);
  }
  async function signup(name,email,password) {
    await apiRequest('/api/v1/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
    await login(email,password,'/onboarding');
  }
  function logout() {storeAuth(null,null);router.push('/login');}
  const jsonPost=(path,body)=>apiRequest(path,{method:'POST',token,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  async function updateProfile(data) {
    const updated=await apiRequest('/api/v1/users/me',{method:'PUT',token,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(readStored('masar_token')===token) {
      setProfile({token,user:updated,error:null});
      if(data.email) storeAuth(updated.access_token || token,updated.email);
    }
    return updated;
  }
  return <AuthContext.Provider value={{token,user,userEmail,loading,profileError,login,signup,logout,updateProfile,
    forgotPassword:email=>jsonPost('/api/v1/auth/forgot-password',{email}),
    resetPassword:(resetToken,newPassword)=>jsonPost('/api/v1/auth/reset-password',{token:resetToken,new_password:newPassword}),
    updatePassword:(current_password,new_password)=>jsonPost('/api/v1/users/me/password',{current_password,new_password})
  }}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
