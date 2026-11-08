"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import {APP_HOME} from "@/config/navigation";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Compass,
  Sparkles,
  ArrowRight,
  Hotel,
  Calendar,
  Navigation,
  ShieldCheck,
  MapPin,
  Star,
  Clock,
  Layers,
  SendHorizontal,
  Zap,
  ChevronRight,
  CheckCircle2,
  LogOut,
  User,
  Globe,
  Award,
  Search,
  Menu,
  X,
  Check,
  Ticket,
} from "lucide-react";
import HeroInteractiveStage from "@/components/landing/HeroInteractiveStage";
import TodayJourneyWidget from "@/components/explore/TodayJourneyWidget";
import WorkflowOrchestrationStage from "@/components/landing/WorkflowOrchestrationStage";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LandingPage() {
  const { token, userEmail, logout } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/chat?prompt=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(APP_HOME);
    }
  };

  const samplePrompts = [
    {
      label: "🏨 Luxury hotel near Burj Khalifa",
      query:
        "Find me a luxury 5-star hotel near Burj Khalifa with fountain views",
    },
    {
      label: "🏎️ F1 Yas Marina & Weekend Trip",
      query:
        "Plan a luxury weekend trip to Abu Dhabi with Yas Island activities",
    },
    {
      label: "🎟️ Upcoming Concerts in Dubai",
      query:
        "What are the biggest concerts and nightlife events happening in Dubai?",
    },
    {
      label: "🚇 Dubai Marina to Frame Route",
      query:
        "How do I travel from Dubai Marina to Dubai Frame using the Metro?",
    },
  ];

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-family, sans-serif)",
        scrollBehavior: "smooth",
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      {/* ── 1. Top Navigation Bar ── */}
      <header
        className="landing-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(20px)",
          backgroundColor: "var(--color-surface-glass)",
          borderBottom: "1px solid var(--color-border)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background-color 0.25s ease, border-color 0.25s ease",
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
          }}
        >
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png"
            alt="Masar AI"
            style={{
              height: "38px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 10px rgba(245, 158, 11, 0.45))",
            }}
          />
          <span className="header-brand-name"><LocalizedText message={"Masar AI"} /></span>
        </Link>

        {/* Center Nav Links (Desktop Only - Landing Page Sections) */}
        <nav className="nav-desktop-links">
          <a
            href="#how-it-works"
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          ><LocalizedText message={"How It Works"} /></a>
          <a
            href="#destinations"
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          ><LocalizedText message={"Destinations"} /></a>
          <a
            href="#get-started"
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          ><LocalizedText message={"Get Started"} /></a>
        </nav>

        {/* Right Auth / CTA & Theme */}
        <div className="landing-header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Desktop Auth */}
          <div
            className="desktop-only"
            style={{ alignItems: "center", gap: "12px" }}
          >
            {token ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <User size={15} color="#F59E0B" />
                  <span>{userEmail?.split("@")[0]}</span>
                </span>
                <Localized element={"button"} attributes={["title"]}
                  onClick={logout}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Logout"
                >
                  <LogOut size={16} />
                </Localized>
              </div>
            ) : (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Link
                  href="/login"
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "8px 14px",
                  }}
                ><LocalizedText message={"Log In"} /></Link>
                <Link
                  href="/signup"
                  style={{
                    fontSize: "14px",
                    color: "#0A0B0E",
                    fontWeight: 700,
                    textDecoration: "none",
                    padding: "9px 18px",
                    borderRadius: "10px",
                    backgroundColor: "#F59E0B",
                    backgroundImage: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                    boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                    transition: "all 0.2s",
                  }}
                ><LocalizedText message={"Sign Up"} /></Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <Localized element={"button"} attributes={["aria-label"]}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-only"
            aria-label="Toggle Navigation Menu"
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Localized>
        </div>
      </header>

      {/* ── Compact Luxury Mobile Dropdown Menu (Underneath Header) ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "64px",
            left: "12px",
            right: "12px",
            backgroundColor: "var(--color-surface-glass)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--color-border)",
            borderRadius: "16px",
            padding: "20px 20px",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            zIndex: 90,
            animation: "fadeInMessage 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <nav
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span><LocalizedText message={"How It Works"} /></span>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </a>
            <a
              href="#destinations"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span><LocalizedText message={"Destinations"} /></span>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </a>
            <a
              href="#get-started"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span><LocalizedText message={"Get Started"} /></span>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </a>
          </nav>

          <div
            style={{ height: "1px", backgroundColor: "var(--color-border)" }}
          />

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {token ? (
              <>
                <Link
                  href={APP_HOME}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "#F59E0B",
                    backgroundImage:
                      "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                    color: "#0A0B0E",
                    fontWeight: 700,
                    fontSize: "14px",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span><LocalizedText message={"Launch Concierge"} /></span>
                  <ArrowRight size={15} />
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                ><LocalizedText preserveValues={[true]} message={"Logout (⟦0⟧)"} values={[userEmail?.split("@")[0]]} /></button>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "transparent",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                      fontSize: "13px",
                      textAlign: "center",
                      textDecoration: "none",
                    }}
                  ><LocalizedText message={"Log In"} /></Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      backgroundColor: "#F59E0B",
                      backgroundImage: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                      color: "#0A0B0E",
                      fontWeight: 700,
                      boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                      fontSize: "13px",
                      textAlign: "center",
                      textDecoration: "none",
                    }}
                  ><LocalizedText message={"Sign Up"} /></Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Interactive Two-Column Synchronized Hero Section ── */}
      <HeroInteractiveStage />
      <div style={{ maxWidth: "1360px", margin: "32px auto 0", padding: "0 24px" }}>
        <TodayJourneyWidget />
      </div>

      {/* ── 3. How It Works: Interactive Travel Creation Stage ── */}
      <WorkflowOrchestrationStage />

      {/* ── 4. Specialized Agents Section ── */}
      {/*  */}

      {/* ── 5. Curated Destinations Showcase ── */}
      <section
        id="destinations"
        style={{
          padding: "100px 24px 110px",
          maxWidth: "1360px",
          margin: "0 auto",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--color-text-primary)",
              margin: "0 0 16px 0",
              lineHeight: 1.2,
            }}
          ><LocalizedText message={"Curated UAE Destinations"} /></h2>

          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "16px",
              maxWidth: "640px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          ><LocalizedText message={"From futuristic skyline penthouses to mountain peaks, coastal resorts, and ancient heritage quarters."} /></p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "24px",
          }}
        >
          {[
            {
              city: "Dubai",
              title: "Downtown & Marina",
              subtitle: "Burj Khalifa, Fountains & Marina Yachts",
              tag: "Futuristic Luxury",
              image:
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
              query:
                "Plan a luxury 3-day itinerary for Dubai Downtown and Palm Jumeirah with 5-star hotels and metro routes.",
            },
            {
              city: "Abu Dhabi",
              title: "Saadiyat & Yas Island",
              subtitle: "Sheikh Zayed Mosque & Ferrari World",
              tag: "Culture & Grand Prix",
              image:
                "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=800&q=80",
              query:
                "What to do in Abu Dhabi for culture at Louvre and VIP passes for Ferrari World on Yas Island?",
            },
            {
              city: "Ras Al Khaimah",
              title: "Jebel Jais & Peaks",
              subtitle: "Highest UAE Peak & Mountain Resorts",
              tag: "Adventure & Vistas",
              image:
                "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80",
              query:
                "Find luxury mountain resorts and zip line activities in Jebel Jais Ras Al Khaimah.",
            },
            {
              city: "Sharjah",
              title: "Heart of Heritage",
              subtitle: "Cultural Museums & Traditional Souks",
              tag: "Islamic Arts & Heritage",
              image:
                "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80",
              query:
                "Tell me about museums, cultural highlights, and historic souks in the Heart of Sharjah.",
            },
            {
              city: "Palm Jumeirah",
              title: "The Palm & Coastal Suites",
              subtitle: "Atlantis The Royal & Beachfront Resorts",
              tag: "Island Living",
              image:
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
              query:
                "Recommend 5-star beachfront resorts on Palm Jumeirah with private infinity pool and dining.",
            },
            {
              city: "Al Marmoom",
              title: "Desert Conservation",
              subtitle: "Starlit Dunes, Wildlife & Heritage Safari",
              tag: "Desert Safari",
              image:
                "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80",
              query:
                "Plan an evening desert safari and sunset dinner in Al Marmoom Desert Conservation Reserve.",
            },
          ].map((dest, idx) => (
            <div
              key={idx}
              onClick={() =>
                router.push(`/chat?prompt=${encodeURIComponent(dest.query)}`)
              }
              style={{
                borderRadius: "22px",
                overflow: "hidden",
                position: "relative",
                height: "340px",
                cursor: "pointer",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-md)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.borderColor = "#F59E0B";
                e.currentTarget.style.boxShadow =
                  "0 16px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(245, 158, 11, 0.25)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
            >
              <Localized element={"img"} attributes={["alt"]}
                src={dest.image}
                alt={dest.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(10, 11, 14, 0.95) 100%)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(10, 11, 14, 0.85)",
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                    color: "#F59E0B",
                    fontSize: "11px",
                    fontWeight: 800,
                    marginBottom: "10px",
                    letterSpacing: "0.04em",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {dest.tag}
                </span>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    margin: "0 0 4px 0",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {dest.title}
                </h3>
                <div
                  style={{
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.7)",
                    marginBottom: "10px",
                  }}
                >
                  {dest.subtitle}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#94A3B8",
                    fontSize: "13px",
                    paddingTop: "8px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <span style={{ color: "#E2E8F0", fontWeight: 600 }}>
                    {dest.city}
                  </span>
                  <span
                    style={{
                      color: "#F59E0B",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 700,
                    }}
                  ><LocalizedText message={"Plan Trip "} /><ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Call to Action Banner ── */}
      <section
        id="get-started"
        style={{
          padding: "80px 24px 100px",
          maxWidth: "1360px",
          margin: "0 auto",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            borderRadius: "32px",
            padding: "68px 48px",
            backgroundColor: "var(--color-surface-glass)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            backdropFilter: "blur(25px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(245, 158, 11, 0.15)",
          }}
        >
          {/* Ambient Spotlight */}
          <div
            style={{
              position: "absolute",
              top: "-50%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "300px",
              background:
                "radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          {/* Masar AI Logo */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <Localized element={"img"} attributes={["alt"]}
              src="/MasarAiLogo.png"
              alt="Masar AI"
              style={{
                height: "64px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 20px rgba(245, 158, 11, 0.45))",
              }}
            />
          </div>

          <h2
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3rem)",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              marginBottom: "16px",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          ><LocalizedText message={"Plan Your Next UAE Getaway With Masar AI"} /></h2>

          <p
            style={{
              fontSize: "16px",
              color: "var(--color-text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 36px auto",
              lineHeight: 1.6,
            }}
          ><LocalizedText message={"Tell our AI travel assistant what you love — whether it is 5-star beach resorts, fine dining, or desert safaris — and get a personalized itinerary in seconds."} /></p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Link
              href={APP_HOME}
              style={{
                padding: "16px 38px",
                borderRadius: "16px",
                backgroundColor: "#F59E0B",
                backgroundImage:
                  "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                color: "#0A0B0E",
                fontWeight: 800,
                fontSize: "15px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 8px 30px rgba(245, 158, 11, 0.4)",
                transition: "all 0.25s ease",
              }}
            >
              <span><LocalizedText message={"Start Planning Free"} /></span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Luxury Production-Ready Multi-Column Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          backgroundColor: "rgba(10, 11, 14, 0.8)",
          backdropFilter: "blur(20px)",
          padding: "60px 32px 36px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
          }}
        >
          {/* Top Multi-Column Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "40px",
              marginBottom: "48px",
            }}
          >
            {/* Col 1: Brand & Mission */}
            <div style={{ gridColumn: "span 1" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <Localized element={"img"} attributes={["alt"]}
                  src="/MasarAiLogo.png"
                  alt="Masar AI"
                  style={{ height: "34px", width: "auto" }}
                />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "18px",
                    color: "var(--color-text-primary)",
                  }}
                ><LocalizedText message={"Masar AI"} /></span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "18px",
                  maxWidth: "300px",
                }}
              ><LocalizedText message={"Your personalized AI travel assistant for Dubai, Abu Dhabi, and the UAE. Discover stays, dining, and custom routes with ease."} /></p>
            </div>

            {/* Col 2: Explore & Plan */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "16px",
                }}
              ><LocalizedText message={"Explore & Plan"} /></div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li>
                  <Link
                    href="/explore"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"Explore UAE Destinations"} /></Link>
                </li>
                <li>
                  <Link
                    href="/trips"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"My Saved Trips & Vault"} /></Link>
                </li>
                <li>
                  <Link
                    href="/preferences"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"Travel Preferences & DNA"} /></Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"AI Chat Assistant"} /></Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Account & Access */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "16px",
                }}
              ><LocalizedText message={"Account"} /></div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li>
                  <Link
                    href="/profile/account"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"My Profile & Settings"} /></Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"Sign In"} /></Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-amber-400"
                  ><LocalizedText message={"Create Free Account"} /></Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Divider & Sub-Footer */}
          <div
            style={{
              paddingTop: "24px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              fontSize: "12px",
              color: "var(--color-text-muted)",
            }}
          >
            <div><LocalizedText message={"© 2026 Masar AI. All rights reserved. Made for the UAE."} /></div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <span><LocalizedText message={"United Arab Emirates (UAE)"} /></span>
              <span><LocalizedText message={"Gulf Standard Time (GST)"} /></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
