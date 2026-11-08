"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  Hotel,
  Ticket,
  Navigation,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Check,
  User,
  Train,
  Smartphone,
  Car,
  Utensils,
  MessageSquare,
  LayoutGrid,
  MapPin,
  Lock,
  Star,
  Clock,
  Sparkles,
  Plane,
} from "lucide-react";

export default function WorkflowOrchestrationStage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // ── Phase 1 Live Animated Chat State ──
  const fullPromptText =
    "Prepare a 5-day luxury stay plan for UAE next week with 5-star hotels, Abu Dhabi day trip, and Metro transit.";
  const [typedPrompt, setTypedPrompt] = useState("");
  const [chatStage, setChatStage] = useState("typing"); // 'typing' | 'sent' | 'thinking'
  const [thinkingMilestone, setThinkingMilestone] = useState(0);

  // ── Phase 2 Animated Specialist Pulse State ──
  const [agentPulseIdx, setAgentPulseIdx] = useState(0);

  // ── Phase 3 Interactive Itinerary Cards State ──
  const [hotelRateLocked, setHotelRateLocked] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState("all"); // 'all' | 'hotel' | 'attraction' | 'transit' | 'dining'

  // ── Phase 4 Full 5-Day Plan State ──
  const [selectedDay, setSelectedDay] = useState(1);

  const FIVE_DAY_PLAN = [
    {
      day: 1,
      title: "Arrival & Downtown Dubai Luxury",
      area: "Downtown Dubai",
      highlights: "VIP Chauffeur • Penthouse Check-in • At.mosphere Dinner",
      schedule: [
        {
          time: "11:00 AM",
          title: "VIP Chauffeur Pick-up from DXB Terminal 3",
          location: "Dubai International Airport",
          icon: Car,
          tag: "Private Transit",
          image:
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "01:30 PM",
          title: "Check-in at Taj Dubai Luxury Penthouse",
          location: "Downtown Dubai",
          icon: Hotel,
          tag: "5-Star Suite",
          image:
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "08:00 PM",
          title: "Sunset Dinner at At.mosphere Level 122",
          location: "Burj Khalifa",
          icon: Utensils,
          tag: "Haute Cuisine",
          image:
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80",
        },
      ],
    },
    {
      day: 2,
      title: "Old Dubai Heritage & Historic Creek",
      area: "Dubai Creek & Cultural Quarter",
      highlights: "Sky Glass Bridge • Historic Souks • Private Abra",
      schedule: [
        {
          time: "10:00 AM",
          title: "Dubai Frame Sky Glass Bridge Experience",
          location: "Zabeel Park",
          icon: Ticket,
          tag: "VIP Pass",
          image:
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "02:00 PM",
          title: "Al Fahidi Historic Quarter & Private Wooden Abra",
          location: "Dubai Creek",
          icon: Navigation,
          tag: "Cultural Tour",
          image:
            "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "07:30 PM",
          title: "Waterfront Dining at Al Seef Heritage Souk",
          location: "Al Seef",
          icon: Utensils,
          tag: "Emirati Flavors",
          image:
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
        },
      ],
    },
    {
      day: 3,
      title: "Abu Dhabi Capital & Yas Island VIP",
      area: "Abu Dhabi & Yas Island",
      highlights:
        "Grand Mosque Walk • Ferrari World Pass • E11 Highway Transit",
      schedule: [
        {
          time: "09:00 AM",
          title: "Scenic Highway Transit to Abu Dhabi",
          location: "E11 Luxury Transit",
          icon: Car,
          tag: "Inter-City Route",
          image:
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "11:30 AM",
          title: "Sheikh Zayed Grand Mosque Private Walk",
          location: "Abu Dhabi",
          icon: ShieldCheck,
          tag: "Verified Etiquette",
          image:
            "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "03:30 PM",
          title: "Ferrari World VIP Fast Track & Formula Rossa",
          location: "Yas Island",
          icon: Ticket,
          tag: "VIP Pass Hold",
          image:
            "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=300&q=80",
        },
      ],
    },
    {
      day: 4,
      title: "Palm Jumeirah & Royal Waterfront",
      area: "Palm Jumeirah & Marina",
      highlights: "The View 360° • Atlantis Cabana • Private Yacht Cruise",
      schedule: [
        {
          time: "11:00 AM",
          title: "The View at The Palm 360° Sky Deck",
          location: "Palm Tower",
          icon: Ticket,
          tag: "Panoramic View",
          image:
            "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "03:00 PM",
          title: "Atlantis Aquaventure & Private Royal Cabana",
          location: "Palm Jumeirah",
          icon: Hotel,
          tag: "Resort VIP",
          image:
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "07:30 PM",
          title: "Sunset Private Yacht Cruise around Dubai Marina",
          location: "Dubai Marina",
          icon: Navigation,
          tag: "Private Yacht",
          image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80",
        },
      ],
    },
    {
      day: 5,
      title: "Desert Sunset & Departure Transfer",
      area: "Al Marmoom & DXB Airport",
      highlights: "Gold Souk Shopping • Dune Conservation • Airport Transfer",
      schedule: [
        {
          time: "10:30 AM",
          title: "Dubai Mall & Gold Souk Curated Shopping",
          location: "Downtown & Deira",
          icon: LayoutGrid,
          tag: "Curated Guide",
          image:
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "03:30 PM",
          title: "Al Marmoom Desert Reserve Sunset Safari",
          location: "Al Marmoom Desert",
          icon: Navigation,
          tag: "Desert Safari",
          image:
            "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=80",
        },
        {
          time: "08:30 PM",
          title: "Direct VIP Chauffeur Transfer to DXB Airport",
          location: "DXB Terminal 3",
          icon: Car,
          tag: "Departure Hold",
          image:
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80",
        },
      ],
    },
  ];

  const STEPS = [
    {
      id: "intent",
      stepNumber: "01",
      title: "Share Your Vision",
      subtitle:
        "Speak or type naturally in English or Arabic with your dates and dream vibes.",
      icon: MessageSquare,
      badge: "Prompt & Plan",
    },
    {
      id: "travel_team",
      stepNumber: "02",
      title: "AI Specialists Curate",
      subtitle:
        "4 specialized UAE travel experts coordinate simultaneously in real-time.",
      icon: Layers,
      badge: "Simultaneous Team",
    },
    {
      id: "interactive_itinerary",
      stepNumber: "03",
      title: "Interactive Itinerary",
      subtitle:
        "Explore live visual cards with real-time hotel rates, transit routes, and holds.",
      icon: LayoutGrid,
      badge: "Live Visual Cards",
    },
    {
      id: "execution",
      stepNumber: "04",
      title: "Confirm & Travel",
      subtitle:
        "Your complete 5-day journey is stored in your vault and synced to your devices.",
      icon: CheckCircle2,
      badge: "Vault & Bookings",
    },
  ];

  // Auto-cycle through steps: 5 seconds in normal condition, 7 seconds when hovering
  useEffect(() => {
    const delay = isHovered ? 7000 : 5000;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, delay);
    return () => clearInterval(interval);
  }, [isHovered, STEPS.length]);

  // ── Phase 1 Animated Typewriter & Continuous Dual Gear Thinking Engine ──
  useEffect(() => {
    if (activeStep !== 0) return;

    let isMounted = true;
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (!isMounted) return;
      if (charIndex === 0) {
        setChatStage("typing");
        setThinkingMilestone(0);
      }
      if (charIndex < fullPromptText.length) {
        setTypedPrompt(fullPromptText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          if (!isMounted) return;
          setChatStage("sent");
          setTimeout(() => {
            if (!isMounted) return;
            setChatStage("thinking");
          }, 450);
        }, 350);
      }
    }, 22);

    const milestoneInterval = setInterval(() => {
      if (!isMounted) return;
      setThinkingMilestone((prev) => (prev + 1) % 3);
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(typeInterval);
      clearInterval(milestoneInterval);
    };
  }, [activeStep]);

  // ── Phase 2 Animated Specialist Pulse Cycle ──
  useEffect(() => {
    if (activeStep !== 1) return;
    const interval = setInterval(() => {
      setAgentPulseIdx((prev) => (prev + 1) % 4);
    }, 900);
    return () => clearInterval(interval);
  }, [activeStep]);

  const currentStep = STEPS[activeStep];
  const activeDayPlan =
    FIVE_DAY_PLAN.find((d) => d.day === selectedDay) || FIVE_DAY_PLAN[0];

  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        padding: "70px 24px 90px",
        maxWidth: "1200px",
        margin: "0 auto",
        overflow: "hidden",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Ambient Luxury Glow ── */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "650px",
          height: "320px",
          background:
            "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(60px)",
        }}
      />

      {/* ── Section Header (Distinct, Non-Redundant & Prestigious) ── */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "32px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontSize: "clamp(2rem, 3.2vw, 2.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            margin: "0 0 10px 0",
            lineHeight: 1.2,
          }}
        ><LocalizedText message={"How Masar AI Crafts Your Dream Trip"} /></h2>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "15px",
            maxWidth: "580px",
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        ><LocalizedText message={"From your first message to confirmed luxury reservations across the UAE."} /></p>
      </div>

      {/* ── Unified Executive Showcase Canvas ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "rgba(18, 20, 24, 0.92)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.08)",
          backdropFilter: "blur(20px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── 1. Top Segmented Progress Tabs ── */}
        <div
          className="workflow-top-tabs-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(10, 11, 14, 0.6)",
          }}
        >
          {STEPS.map((s, idx) => {
            const isActive = idx === activeStep;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                className="workflow-top-tab-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "16px 14px",
                  backgroundColor: isActive
                    ? "rgba(245, 158, 11, 0.12)"
                    : "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid #F59E0B"
                    : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: "none",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: isActive ? "#FBBF24" : "#64748B",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    backgroundColor: isActive
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {s.stepNumber}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#FFFFFF" : "#94A3B8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 2. Active Step Narrative Banner ── */}
        <div
          className="workflow-sub-banner"
          style={{
            padding: "16px 28px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            backgroundColor: "rgba(14, 16, 21, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
                boxShadow: "0 0 8px #10B981",
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: "13px", color: "#E2E8F0", fontWeight: 600 }}
            >
              <strong style={{ color: "#FBBF24" }}><LocalizedText message={"Phase ⟦0⟧:"} values={[currentStep.stepNumber]} /></strong>{" "}
              {currentStep.subtitle}
            </span>
          </div>

          <Link
            href="/chat"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "999px",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              fontSize: "12px",
              fontWeight: 700,
              color: "#FBBF24",
              textDecoration: "none",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            <span><LocalizedText message={"Start Planning in Chat"} /></span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* ── 3. Spacious Interactive Center Stage ── */}
        <div
          className="workflow-stage-body"
          style={{
            padding: "24px 28px 28px",
            minHeight: "350px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          {/* ══════════════════════════════════════════════════════════════════
              PHASE 1: LIVE ANIMATED CHAT & CONTINUOUS REASONING
              ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                maxWidth: "820px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              {/* User Prompt Bubble */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: "18px 18px 4px 18px",
                    padding: "14px 18px",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    lineHeight: 1.55,
                  }}
                >
                  <span>{typedPrompt}</span>
                  {chatStage === "typing" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "14px",
                        backgroundColor: "#F59E0B",
                        marginInlineStart: "4px",
                        verticalAlign: "middle",
                        animation: "pulseDot 0.8s infinite",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0A0B0E",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  <User size={18} />
                </div>
              </div>

              {/* AI Thinking Mode with Dual Interlocking Gold Gears */}
              {chatStage === "thinking" && (
                <div
                  style={{
                    backgroundColor: "rgba(10, 11, 14, 0.7)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "18px",
                    padding: "18px 22px",
                    boxShadow: "0 8px 30px rgba(245, 158, 11, 0.15)",
                    animation: "fadeInMessage 0.35s ease-out",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                    }}
                  >
                    {/* Dual Interlocking Gold Gears SVG */}
                    <svg
                      width="68"
                      height="48"
                      viewBox="0 0 68 48"
                      style={{
                        flexShrink: 0,
                        filter: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.5))",
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="goldGearGrad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#FDE68A" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                      </defs>

                      {/* Primary Big Gear */}
                      <g
                        className="gear-cog-clockwise"
                        style={{ transformOrigin: "24px 24px" }}
                      >
                        <circle
                          cx="24"
                          cy="24"
                          r="15"
                          fill="none"
                          stroke="url(#goldGearGrad)"
                          strokeWidth="3.2"
                        />
                        <circle cx="24" cy="24" r="5" fill="#F59E0B" />
                        <circle cx="24" cy="24" r="2" fill="#0A0B0E" />
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                          <rect
                            key={deg}
                            x="22"
                            y="6"
                            width="4"
                            height="5"
                            rx="1"
                            fill="url(#goldGearGrad)"
                            transform={`rotate(${deg} 24 24)`}
                          />
                        ))}
                      </g>

                      {/* Secondary Small Gear */}
                      <g
                        className="gear-cog-counter"
                        style={{ transformOrigin: "50px 24px" }}
                      >
                        <circle
                          cx="50"
                          cy="24"
                          r="11"
                          fill="none"
                          stroke="url(#goldGearGrad)"
                          strokeWidth="2.8"
                        />
                        <circle cx="50" cy="24" r="4" fill="#FBBF24" />
                        <circle cx="50" cy="24" r="1.5" fill="#0A0B0E" />
                        {[0, 60, 120, 180, 240, 300].map((deg) => (
                          <rect
                            key={deg}
                            x="48.5"
                            y="10.5"
                            width="3"
                            height="4"
                            rx="0.8"
                            fill="url(#goldGearGrad)"
                            transform={`rotate(${deg} 50 24)`}
                          />
                        ))}
                      </g>
                    </svg>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#F59E0B",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        ><LocalizedText message={"AI Travel Concierge Active"} /></span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#10B981",
                            fontWeight: 800,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        ><LocalizedText message={"CRAFTING 5-DAY PLAN"} /></span>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#FFFFFF",
                          fontWeight: 600,
                        }}
                      >
                        <LocalizedText>{thinkingMilestone === 0 &&
                          "Planning your 5-day timeline across Dubai & Abu Dhabi..."}</LocalizedText>
                        <LocalizedText>{thinkingMilestone === 1 &&
                          "Finding 5-star suites with Burj Khalifa & fountain views..."}</LocalizedText>
                        <LocalizedText>{thinkingMilestone >= 2 &&
                          "Coordinating smooth city transit & Ferrari World passes..."}</LocalizedText>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "3px",
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          borderRadius: "999px",
                          overflow: "hidden",
                          marginTop: "2px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width:
                              thinkingMilestone === 0
                                ? "40%"
                                : thinkingMilestone === 1
                                  ? "75%"
                                  : "95%",
                            background:
                              "linear-gradient(90deg, #FBBF24, #D97706)",
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PHASE 2: MASAR AI MULTI-AGENT ORCHESTRATION ENGINE
              ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: "960px",
                margin: "0 auto",
                width: "100%",
                animation: "fadeInMessage 0.35s ease-out",
              }}
            >
              {/* 1. MASTER CONDUCTOR NODE: Masar AI Travel Director */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div
                  className="workflow-director-card"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "9px 20px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid #F59E0B",
                    boxShadow: "0 0 25px rgba(245, 158, 11, 0.35)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0A0B0E",
                      boxShadow: "0 0 12px rgba(245, 158, 11, 0.5)",
                      flexShrink: 0,
                    }}
                  >
                    <Layers size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#FFFFFF",
                          letterSpacing: "0.02em",
                        }}
                      ><LocalizedText message={"Masar AI Multi-Agent Director"} /></span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#10B981",
                          color: "#0A0B0E",
                          fontWeight: 800,
                        }}
                      ><LocalizedText message={"4 SPECIALISTS ACTIVE"} /></span>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#FBBF24",
                        fontWeight: 600,
                        marginTop: "1px",
                      }}
                    ><LocalizedText message={"Orchestrating 4 UAE destination experts in parallel"} /></div>
                  </div>
                </div>
              </div>

              {/* 2. DYNAMIC ANIMATED SVG ENERGY CONDUITS */}
              <div
                className="workflow-energy-conduits"
                style={{
                  height: "32px",
                  width: "100%",
                  position: "relative",
                  overflow: "visible",
                  margin: "-2px 0",
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 400 32"
                  preserveAspectRatio="none"
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <linearGradient
                      id="multiBeamGrad"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                      <stop
                        offset="100%"
                        stopColor="#10B981"
                        stopOpacity="0.8"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 200 0 C 200 16, 50 12, 50 32"
                    fill="none"
                    stroke="url(#multiBeamGrad)"
                    strokeWidth="1.8"
                    className="svg-animated-dotted-beam"
                  />
                  <path
                    d="M 200 0 C 200 16, 150 12, 150 32"
                    fill="none"
                    stroke="url(#multiBeamGrad)"
                    strokeWidth="1.8"
                    className="svg-animated-dotted-beam"
                  />
                  <path
                    d="M 200 0 C 200 16, 250 12, 250 32"
                    fill="none"
                    stroke="url(#multiBeamGrad)"
                    strokeWidth="1.8"
                    className="svg-animated-dotted-beam"
                  />
                  <path
                    d="M 200 0 C 200 16, 350 12, 350 32"
                    fill="none"
                    stroke="url(#multiBeamGrad)"
                    strokeWidth="1.8"
                    className="svg-animated-dotted-beam"
                  />
                  <circle
                    cx="200"
                    cy="0"
                    r="3"
                    fill="#F59E0B"
                    filter="drop-shadow(0 0 4px #F59E0B)"
                  />
                </svg>
              </div>

              {/* 3. 4 CONCURRENT SPECIALIST DESTINATION EXPERTS */}
              <div
                className="workflow-specialists-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {[
                  {
                    id: 0,
                    name: "Luxury Stays Specialist",
                    role: "5-Star Suites & Resorts",
                    status: "Verified 5-Star",
                    color: "#F59E0B",
                    icon: Hotel,
                    task: "Taj Dubai Luxury Penthouse & Burj Khalifa Views",
                  },
                  {
                    id: 1,
                    name: "VIP Events Specialist",
                    role: "Passes & Priority Access",
                    status: "Hold Active",
                    color: "#FBBF24",
                    icon: Ticket,
                    task: "Ferrari World Fast Track & Sky Lounge Access",
                  },
                  {
                    id: 2,
                    name: "City Transit & Chauffeur",
                    role: "Transfers & Metro Transit",
                    status: "Optimized Route",
                    color: "#10B981",
                    icon: Navigation,
                    task: "DXB Airport VIP Chauffeur & Highway Transit",
                  },
                  {
                    id: 3,
                    name: "Fine Dining & Culture",
                    role: "Michelin Spots & Etiquette",
                    status: "Reserved",
                    color: "#38BDF8",
                    icon: ShieldCheck,
                    task: "At.mosphere Level 122 & Al Seef Heritage Tour",
                  },
                ].map((agent) => {
                  const AgentIcon = agent.icon;
                  const isPulsing = agentPulseIdx === agent.id;
                  return (
                    <div
                      key={agent.id}
                      className="workflow-specialist-card"
                      style={{
                        backgroundColor: "rgba(14, 16, 21, 0.75)",
                        border: isPulsing
                          ? `1px solid ${agent.color}`
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "16px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        boxShadow: isPulsing
                          ? `0 0 24px ${agent.color}33`
                          : "none",
                        transition: "all 0.25s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            backgroundColor: `${agent.color}1A`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: agent.color,
                          }}
                        >
                          <AgentIcon size={15} />
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#10B981",
                            fontWeight: 800,
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {agent.status}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#FFFFFF",
                        }}
                      >
                        {agent.name}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          color: isPulsing ? agent.color : "#94A3B8",
                          fontWeight: 500,
                          lineHeight: 1.35,
                        }}
                      >
                        {agent.task}
                      </div>

                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748B",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "auto",
                          paddingTop: "4px",
                        }}
                      >
                        <Check size={11} color="#10B981" />
                        <span>{agent.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PHASE 3: MAGAZINE-GRADE INTERACTIVE CARDS & ROUTES
              ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxWidth: "1000px",
                margin: "0 auto",
                width: "100%",
                animation: "fadeInMessage 0.35s ease-out",
              }}
            >
              {/* Category Filter Pills */}
              <div
                className="workflow-filter-pills-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  overflowX: "auto",
                  justifyContent: "center",
                }}
              >
                {[
                  {
                    id: "all",
                    label: "All Highlights (4)",
                    icon: LayoutGrid,
                  },
                  { id: "hotel", label: "5-Star Penthouse", icon: Hotel },
                  { id: "attraction", label: "VIP Pass Hold", icon: Ticket },
                  { id: "transit", label: "Smart Transit Route", icon: Train },
                  { id: "dining", label: "Haute Cuisine", icon: Utensils },
                ].map((cat) => {
                  const isSelected = activeCardFilter === cat.id;
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCardFilter(cat.id)}
                      className="workflow-filter-pill-btn"
                      style={{
                        padding: "6px 14px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: isSelected
                          ? "rgba(245, 158, 11, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                        border: isSelected
                          ? "1px solid #F59E0B"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        color: isSelected ? "#FBBF24" : "#94A3B8",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CatIcon size={13} />
                      <span><LocalizedText>{cat.label}</LocalizedText></span>
                    </button>
                  );
                })}
              </div>

              {/* Magazine-Grade Visual Discovery Cards Grid */}
              <div
                className="workflow-discovery-cards-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                  gap: "16px",
                }}
              >
                {/* 1. HOTEL CARD (With Photo, Rating, Rate Hold Action) */}
                {(activeCardFilter === "all" ||
                  activeCardFilter === "hotel") && (
                  <div
                    style={{
                      backgroundColor: "rgba(14, 16, 21, 0.85)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "18px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height: "130px",
                        width: "100%",
                      }}
                    >
                      <Localized element={"img"} attributes={["alt"]}
                        src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80"
                        alt="Taj Dubai Penthouse"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(14,16,21,0.95) 0%, transparent 60%)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          backdropFilter: "blur(6px)",
                          color: "#FBBF24",
                          fontSize: "10px",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Star size={10} fill="#FBBF24" />
                        <span><LocalizedText message={"4.9 (520+ Reviews)"} /></span>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(10, 11, 14, 0.85)",
                          border: "1px solid rgba(245,158,11,0.5)",
                          color: "#FBBF24",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      ><LocalizedText message={"$420 / nt"} /></div>
                    </div>
                    <div
                      style={{
                        padding: "14px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "#FFFFFF",
                        }}
                      ><LocalizedText message={"Taj Dubai Luxury Penthouse"} /></div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#94A3B8",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <MapPin size={11} color="#F59E0B" />
                        <span><LocalizedText message={"Downtown Dubai • Burj Khalifa Fountain Views"} /></span>
                      </div>
                      <button
                        onClick={() => setHotelRateLocked(!hotelRateLocked)}
                        style={{
                          marginTop: "8px",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          backgroundColor: hotelRateLocked
                            ? "rgba(16, 185, 129, 0.18)"
                            : "rgba(245, 158, 11, 0.15)",
                          border: hotelRateLocked
                            ? "1px solid #10B981"
                            : "1px solid rgba(245, 158, 11, 0.35)",
                          color: hotelRateLocked ? "#34D399" : "#FBBF24",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s",
                        }}
                      >
                        <Lock size={12} />
                        <span>
                          <LocalizedText>{hotelRateLocked
                            ? "Rate Hold Active • Guaranteed 24h"
                            : "Lock 24-Hr Price Hold"}</LocalizedText>
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. VIP PASS CARD (With Photo, Instant Voucher Badge) */}
                {(activeCardFilter === "all" ||
                  activeCardFilter === "attraction") && (
                  <div
                    style={{
                      backgroundColor: "rgba(14, 16, 21, 0.85)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "18px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height: "130px",
                        width: "100%",
                      }}
                    >
                      <Localized element={"img"} attributes={["alt"]}
                        src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80"
                        alt="Ferrari World Abu Dhabi"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(14,16,21,0.95) 0%, transparent 60%)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          backgroundColor: "rgba(16,185,129,0.2)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          color: "#34D399",
                          fontSize: "10px",
                          fontWeight: 800,
                        }}
                      ><LocalizedText message={"Fast Track Hold"} /></div>
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      ><LocalizedText message={"VIP Access"} /></div>
                    </div>
                    <div
                      style={{
                        padding: "14px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "#FFFFFF",
                        }}
                      ><LocalizedText message={"Ferrari World Abu Dhabi"} /></div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#94A3B8",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <MapPin size={11} color="#F59E0B" />
                        <span><LocalizedText message={"Yas Island • Formula Rossa Queue Bypass"} /></span>
                      </div>
                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#10B981",
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span><LocalizedText message={"Instant Digital Voucher"} /></span>
                        </span>
                        <span style={{ color: "#FBBF24" }}><LocalizedText message={"Included in Day 3"} /></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SMART TRANSIT ROUTE CARD (Interactive Visual Route Line) */}
                {(activeCardFilter === "all" ||
                  activeCardFilter === "transit") && (
                  <div
                    style={{
                      backgroundColor: "rgba(14, 16, 21, 0.85)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "18px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#10B981",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        ><LocalizedText message={"Smart Transit Corridor"} /></span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(16,185,129,0.15)",
                            color: "#34D399",
                            fontWeight: 800,
                          }}
                        ><LocalizedText message={"22 Mins • Direct"} /></span>
                      </div>

                      {/* Visual Connected Route Track */}
                      <div
                        style={{
                          backgroundColor: "rgba(10, 11, 14, 0.6)",
                          borderRadius: "12px",
                          padding: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          marginBottom: "10px",
                        }}
                      >
                        {/* Origin Node */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: "#FFFFFF",
                            fontWeight: 700,
                          }}
                        >
                          <Plane size={14} color="#F59E0B" />
                          <span><LocalizedText message={"DXB International Airport (T3)"} /></span>
                        </div>
                        {/* Connecting Route Line */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            margin: "6px 0 6px 6px",
                          }}
                        >
                          <div
                            style={{
                              width: "2px",
                              height: "20px",
                              backgroundColor: "#F59E0B",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#94A3B8",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "rgba(255,255,255,0.05)",
                            }}
                          ><LocalizedText message={"Metro Red Line Express / Chauffeur"} /></span>
                        </div>
                        {/* Destination Node */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: "#FFFFFF",
                            fontWeight: 700,
                          }}
                        >
                          <Hotel size={14} color="#10B981" />
                          <span><LocalizedText message={"Taj Dubai Penthouse (Downtown)"} /></span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748B",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Check size={11} color="#10B981" />
                      <span><LocalizedText message={"Nol Gold Card Synced & Chauffeur Tracked"} /></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PHASE 4: CONNECTED GOLDEN MILESTONE TIMELINE
              ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 3 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxWidth: "920px",
                margin: "0 auto",
                width: "100%",
                animation: "fadeInMessage 0.35s ease-out",
              }}
            >
              {/* 5-Day Carousel Tabs */}
              <div
                className="workflow-days-tabs-bar"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "8px",
                }}
              >
                {FIVE_DAY_PLAN.map((plan) => {
                  const isDayActive = selectedDay === plan.day;
                  return (
                    <button
                      key={plan.day}
                      onClick={() => setSelectedDay(plan.day)}
                      className="workflow-day-tab-btn"
                      style={{
                        padding: "10px 8px",
                        borderRadius: "14px",
                        backgroundColor: isDayActive
                          ? "rgba(245, 158, 11, 0.2)"
                          : "rgba(255, 255, 255, 0.04)",
                        border: isDayActive
                          ? "1px solid #F59E0B"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        color: isDayActive ? "#FBBF24" : "#94A3B8",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: isDayActive
                          ? "0 0 16px rgba(245, 158, 11, 0.25)"
                          : "none",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 800 }}><LocalizedText message={"Day ⟦0⟧"} values={[plan.day]} /></div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: isDayActive ? "#FFFFFF" : "#64748B",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "1px",
                        }}
                      >
                        {plan.area.split("&")[0].trim()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sovereign Connected Golden Milestone Stage */}
              <div
                style={{
                  backgroundColor: "rgba(14, 16, 21, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "20px",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Day Header Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#FFFFFF",
                      }}
                    ><LocalizedText preserveValues={[false,true]} message={"Day ⟦0⟧: ⟦1⟧"} values={[activeDayPlan.day,activeDayPlan.title]} /></span>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        marginTop: "2px",
                      }}
                    >
                      {activeDayPlan.highlights}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      backgroundColor: "rgba(245,158,11,0.15)",
                      color: "#FBBF24",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {activeDayPlan.area}
                  </span>
                </div>

                {/* Milestone Timeline List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    position: "relative",
                  }}
                >
                  {activeDayPlan.schedule.map((item, sIdx) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={sIdx}
                        className="workflow-milestone-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "14px",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          gap: "12px",
                        }}
                      >
                        {/* Left: Milestone Number */}
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            color: "#FBBF24",
                            fontSize: "11px",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          0{sIdx + 1}
                        </div>

                        {/* Middle: Structured Time, Tag, and Untruncated Title */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                              marginBottom: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#F59E0B",
                              }}
                            >
                              {item.time}
                            </span>
                            <span
                              style={{ fontSize: "10px", color: "#64748B" }}
                            >
                              •
                            </span>
                            <span
                              style={{ fontSize: "10px", color: "#94A3B8" }}
                            >
                              {item.location}
                            </span>
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(245, 158, 11, 0.12)",
                                color: "#F59E0B",
                                fontWeight: 700,
                                marginInlineStart: "auto",
                              }}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#FFFFFF",
                              fontWeight: 700,
                              lineHeight: 1.35,
                            }}
                          >
                            {item.title}
                          </div>
                        </div>

                        {/* Right: Media Thumbnail */}
                        <Localized element={"img"} attributes={["alt"]}
                          src={item.image}
                          alt={item.title}
                          style={{
                            width: "48px",
                            height: "40px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "1px solid rgba(255,255,255,0.1)",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Sync Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#34D399",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span><LocalizedText message={"Full 5-Day Plan Stored in Trips Vault"} /></span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}><LocalizedText message={"Apple Wallet & Google Calendar Ready"} /></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
