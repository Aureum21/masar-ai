"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("No reset token provided. Please use the link from your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '440px',
      backgroundColor: 'rgba(18, 20, 24, 0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      borderRadius: '24px',
      padding: '40px 36px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.12)',
    }}>
      <LanguageSwitcher className="page-language-switcher"/>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png" 
            alt="Masar AI Logo" 
            style={{ height: '64px', width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(245, 158, 11, 0.45))' }}
          />
        </div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #FFFFFF 40%, #F59E0B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em'
        }}><LocalizedText message={"Create New Password"} /></h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #A0AEC0)', margin: 0 }}><LocalizedText message={"Please enter your new password below"} /></p>
      </div>

      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#FB7185',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          <LocalizedText>{error}</LocalizedText>
        </div>
      )}

      {success ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34D399',
            fontSize: '14px',
            marginBottom: '24px'
          }}><LocalizedText message={"Password has been reset successfully!"} /></div>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'background-color 0.2s'
          }}><LocalizedText message={"Proceed to Login"} /></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}><LocalizedText message={"New Password"} /></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  backgroundColor: 'rgba(10, 11, 14, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}><LocalizedText message={"Confirm Password"} /></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  backgroundColor: 'rgba(10, 11, 14, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#F59E0B',
              backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
              color: '#0A0B0E',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              marginTop: '8px'
            }}
          >
            <LocalizedText>{loading ? "Resetting..." : "Reset Password"}</LocalizedText>
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--color-bg, #0A0B0E)',
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245, 158, 11, 0.15), transparent), radial-gradient(circle at 50% 100%, rgba(18, 20, 24, 1), #0A0B0E)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <Link href="/login" style={{
        position: 'absolute',
        top: '32px',
        insetInlineStart: '32px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--color-text-secondary, #A0AEC0)',
        fontSize: '14px',
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}>
        <ArrowLeft size={16} />
        <span><LocalizedText message={"Back to Login"} /></span>
      </Link>
      
      <Suspense fallback={<div style={{ color: '#fff' }}><LocalizedText message={"Loading..."} /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
