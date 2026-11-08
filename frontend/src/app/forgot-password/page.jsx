"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

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
      <LanguageSwitcher className="page-language-switcher"/>
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
          }}><LocalizedText message={"Reset Password"} /></h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #A0AEC0)', margin: 0 }}><LocalizedText message={"Enter your email to receive a reset link"} /></p>
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
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34D399',
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: 1.5
          }}><LocalizedText message={"If that email is in our system, you will receive a password reset link shortly. Please check your inbox."} /></div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}><LocalizedText message={"Email Address"} /></label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <Localized element={"input"} attributes={["placeholder"]}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
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
              <LocalizedText>{loading ? "Sending..." : "Send Reset Link"}</LocalizedText>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
