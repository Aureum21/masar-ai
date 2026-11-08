"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, User, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err.message || "Failed to create account");
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
      {/* Back to Home link */}
      <Link href="/" style={{
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
        <span><LocalizedText message={"Return to Masar AI"} /></span>
      </Link>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'rgba(18, 20, 24, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
          }}><LocalizedText message={"Create Your Account"} /></h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #A0AEC0)', margin: 0 }}><LocalizedText message={"Unlock sovereign UAE travel intelligence & personalized bookings"} /></p>
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

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}><LocalizedText message={"Full Name"} /></label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <Localized element={"input"} attributes={["placeholder"]}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Al Mansoori"
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}><LocalizedText message={"Password"} /></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <Localized element={"input"} attributes={["placeholder"]}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
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
            <LocalizedText>{loading ? "Creating Account..." : "Create Free Account"}</LocalizedText>
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}><LocalizedText message={"Already have an account?"} />{" "}
          <Link href="/login" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}><LocalizedText message={"Sign in"} /></Link>
        </div>
      </div>
    </div>
  );
}
