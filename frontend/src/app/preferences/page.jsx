"use client";
import {useI18n} from '@/i18n/LocaleProvider';
import {Localized,LocalizedText} from '@/i18n/Localized';

import TravellerSupportEditor from '@/components/planning/TravellerSupportEditor';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { API_BASE } from '@/lib/api';
import { normalisePreferences } from '@/utils/preferences';

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  CheckCircle2,
  Building2,
  SunMedium,
  UtensilsCrossed,
  Award,
  Save,
  RefreshCw,
  ShieldCheck,
  Landmark,
  Palmtree,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Mountain,
  Scale,
  Key,
  Car,
  Users,
  Check,
  User,
  Zap,
  Coffee,
  Heart,
  BookOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import MasarPageHeader from "@/components/layout/MasarPageHeader";
import NotificationBell from "@/components/notifications/NotificationBell";

// ── Simple, Friendly Preference Options ──
const VIBE_CHIPS = [
  { id: "Luxury & VIP", label: "Luxury & VIP", icon: Award },
  { id: "Culture & Heritage", label: "Culture & Heritage", icon: Landmark },
  { id: "Desert & Dunes", label: "Desert & Dunes", icon: SunMedium },
  { id: "Beach & Coastal", label: "Beach & Sea", icon: Palmtree },
  { id: "Gastronomy & Dining", label: "Food & Dining", icon: UtensilsCrossed },
  {
    id: "Architectural Marvels",
    label: "City & Architecture",
    icon: Building2,
  },
  { id: "Shopping & Malls", label: "Shopping & Fashion", icon: ShoppingBag },
  { id: "Nature & Highlands", label: "Mountains & Nature", icon: Mountain },
];

const PACE_TRACK = [
  {
    id: "Relaxed",
    label: "Easy & Relaxed",
    icon: Coffee,
    sub: "1-2 stops/day with plenty of rest",
  },
  {
    id: "Balanced",
    label: "Balanced",
    icon: Scale,
    sub: "3-4 stops/day with good breaks",
  },
  {
    id: "Fast-paced",
    label: "Fast-Paced",
    icon: Zap,
    sub: "Pack in as much as possible",
  },
];

const STAY_TRACK = [
  { id: "5-Star Luxury Resorts", label: "5-Star Resorts", icon: Award },
  { id: "Desert Villas", label: "Desert Villas", icon: SunMedium },
  { id: "Boutique Heritage", label: "Heritage Hotels", icon: Landmark },
  { id: "Modern Penthouses", label: "City Apartments", icon: Building2 },
];

const TRANSIT_TRACK = [
  { id: "Private Chauffeur", label: "Private Driver", icon: ShieldCheck },
  { id: "Careem Luxury Taxi", label: "Taxi / Careem", icon: Car },
  { id: "Dubai Metro Gold", label: "Dubai Metro", icon: Zap },
  { id: "Self-Drive SUV", label: "Rental Car", icon: Key },
];

const BUDGET_TRACK = [
  { id: "Curated Premium", label: "Standard", badge: "$$" },
  { id: "Executive Luxury", label: "Luxury", badge: "$$$" },
  { id: "Sovereign Ultra-Luxury", label: "Ultra-Luxury", badge: "$$$$" },
];

const PARTY_TRACK = [
  { id: "Solo Voyager", label: "Solo", icon: User },
  { id: "Romantic Couple", label: "Couple", icon: Heart },
  { id: "Family with Children", label: "Family", icon: Users },
  { id: "VIP Delegation", label: "Group", icon: Sparkles },
];

const DIETARY_CHIPS = [
  "Halal",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Fine Dining",
  "Local Emirati Food",
  "Rooftop Views",
  "Romantic Spots",
  "Family Friendly",
];

function PreferencesContent() {
  const {t}=useI18n();
  const { token, updateProfile } = useAuth();

  const [preferences, setPreferences] = useState({
    vibes: ["Luxury & VIP", "Culture & Heritage"],
    preferred_pace: "Balanced",
    accommodation_style: "5-Star Luxury Resorts",
    transit_style: "Private Chauffeur",
    budget_tier: "Executive Luxury",
    party_type: "Romantic Couple",
    dietary: ["Halal", "Fine Dining"],
    custom_notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          if (
            user.travel_preferences &&
            typeof user.travel_preferences === "object"
          ) {
            setPreferences((prev) => ({
              ...prev,
              ...normalisePreferences(user.travel_preferences),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load travel preferences", err);
      }
    };

    if (token) fetchUserPreferences();
  }, [token]);

  // Toggle multi-select vibes
  const toggleVibe = (vibeId) => {
    setPreferences((prev) => {
      const current = prev.vibes || [];
      const exists = current.includes(vibeId);
      const updated = exists
        ? current.filter((v) => v !== vibeId)
        : [...current, vibeId];
      return { ...prev, vibes: updated.length > 0 ? updated : [vibeId] };
    });
  };

  // Toggle multi-select dietary
  const toggleDiet = (diet) => {
    setPreferences((prev) => {
      const current = prev.dietary || [];
      const exists = current.includes(diet);
      return {
        ...prev,
        dietary: exists
          ? current.filter((d) => d !== diet)
          : [...current, diet],
      };
    });
  };

  // Simple, friendly traveler style generator
  const travelStyle = useMemo(() => {
    const vibes = preferences.vibes || [];
    const hasCulture = vibes.includes("Culture & Heritage");
    const hasLuxury = vibes.includes("Luxury & VIP");
    const hasDesert = vibes.includes("Desert & Dunes");
    const hasBeach = vibes.includes("Beach & Coastal");
    const hasDining = vibes.includes("Gastronomy & Dining");
    const hasArch = vibes.includes("Architectural Marvels");

    if (hasCulture && hasLuxury) {
      return {
        title: "Culture & Heritage Explorer",
        tagline:
          "You love discovering historic souks, museums, and staying in great hotels.",
      };
    }
    if (hasDesert) {
      return {
        title: "Desert & Adventure Lover",
        tagline:
          "You enjoy desert safaris, starry nights, and relaxing pool villas.",
      };
    }
    if (hasDining && hasLuxury) {
      return {
        title: "Food & Dining Enthusiast",
        tagline:
          "You enjoy great restaurants, fine dining, and scenic rooftop views.",
      };
    }
    if (hasBeach) {
      return {
        title: "Beach & Coastal Traveler",
        tagline: "You love ocean views, beach clubs, and relaxing boat trips.",
      };
    }
    if (hasArch) {
      return {
        title: "City & Architecture Explorer",
        tagline:
          "You love iconic skylines, modern landmarks, and vibrant cities.",
      };
    }

    return {
      title: "All-Round UAE Traveler",
      tagline:
        "You enjoy a great mix of sightseeing, delicious food, and relaxing stays.",
    };
  }, [preferences.vibes]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      if (updateProfile) {
        await updateProfile({ travel_preferences: normalisePreferences(preferences, {interests: preferences.vibes, dietary_restrictions: preferences.dietary}) });
      } else {
        await fetch(`${API_BASE}/api/v1/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ travel_preferences: normalisePreferences(preferences, {interests: preferences.vibes, dietary_restrictions: preferences.dietary}) }),
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to save preferences", err);
      alert(t("Could not save preferences. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // Helper to get friendly labels for summary
  const getPaceLabel = () =>
    PACE_TRACK.find((p) => p.id === preferences.preferred_pace)?.label ||
    preferences.preferred_pace;
  const getStayLabel = () =>
    STAY_TRACK.find((s) => s.id === preferences.accommodation_style)?.label ||
    preferences.accommodation_style;
  const getTransitLabel = () =>
    TRANSIT_TRACK.find((t) => t.id === preferences.transit_style)?.label ||
    preferences.transit_style;
  const getBudgetLabel = () =>
    BUDGET_TRACK.find((b) => b.id === preferences.budget_tier)?.label ||
    preferences.budget_tier;

  return (
    <div className="app-container">
      <LanguageSwitcher className="page-language-switcher"/>
      {/* ── 1. Left Sidebar Navigation ── */}
      <Sidebar />

      {/* ── 2. Content Stage ── */}
      <div
        className="content-stage"
        style={{ overflowY: "auto", backgroundColor: "#090A0D" }}
      >
        <div className="masar-dashboard-page">
          {/* ── MASAR AI Unified Page Header (Obsidian Luxury) ── */}
          <Localized element={MasarPageHeader} attributes={["breadcrumbSection","title","subtitle"]}
            breadcrumbSection="PREFERENCES"
            breadcrumbHref="/preferences"
            title="Travel preferences"
            subtitle="Tell us what you like so Masar AI can personalize your trips and recommendations."
            topRightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <NotificationBell />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    border: "none",
                    color: "#0A0B0E",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 10px rgba(245, 158, 11, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" />
                      <span><LocalizedText message={"Saving..."} /></span>
                    </>
                  ) : (
                    <>
                      <Save size={14} strokeWidth={2.5} />
                      <span><LocalizedText message={"Save Preferences"} /></span>
                    </>
                  )}
                </button>
              </div>
            }
          />

          {/* Success Banner */}
          {savedSuccess && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "14px",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#34D399",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                animation: "fadeIn 0.2s ease",
              }}
            >
              <CheckCircle2 size={16} color="#34D399" />
              <span><LocalizedText message={"Preferences saved! Masar AI will use these for your next trip."} /></span>
            </div>
          )}

          {/* ── 2-Column Split Interface ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(360px, 1.1fr)",
              gap: "36px",
              alignItems: "start",
            }}
          >
            {/* ── LEFT: Simple & Clean Settings ── */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "28px" }}
            >
              {/* 1. Vibes Cloud */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}
                  ><LocalizedText message={"What kind of vibe do you like?"} /></div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#FBBF24",
                      fontWeight: 700,
                    }}
                  ><LocalizedText message={"⟦0⟧ selected"} values={[preferences.vibes?.length || 0]} /></span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {VIBE_CHIPS.map((chip) => {
                    const Icon = chip.icon;
                    const isSelected = (preferences.vibes || []).includes(
                      chip.id,
                    );
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => toggleVibe(chip.id)}
                        style={{
                          padding: "9px 15px",
                          borderRadius: "9999px",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "rgba(255, 255, 255, 0.04)",
                          border: isSelected
                            ? "1px solid #F59E0B"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isSelected ? "#FBBF24" : "#CBD5E1",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected
                            ? "0 2px 10px rgba(245, 158, 11, 0.2)"
                            : "none",
                        }}
                      >
                        <Icon
                          size={13}
                          color={isSelected ? "#FBBF24" : "#94A3B8"}
                        />
                        <span><LocalizedText>{chip.label}</LocalizedText></span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pace Track */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}
                  ><LocalizedText message={"How fast do you like to travel?"} /></div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94A3B8",
                      fontWeight: 600,
                    }}
                  >
                    {
                      PACE_TRACK.find(
                        (p) => p.id === preferences.preferred_pace,
                      )?.sub
                    }
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    padding: "4px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    gap: "4px",
                  }}
                >
                  {PACE_TRACK.map((pace) => {
                    const isSelected = preferences.preferred_pace === pace.id;
                    const Icon = pace.icon;
                    return (
                      <button
                        key={pace.id}
                        type="button"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            preferred_pace: pace.id,
                          })
                        }
                        style={{
                          padding: "10px 8px",
                          borderRadius: "10px",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "transparent",
                          border: isSelected
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid transparent",
                          color: isSelected ? "#FBBF24" : "#94A3B8",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={13} />
                        <span><LocalizedText>{pace.label}</LocalizedText></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Stays */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}
                  ><LocalizedText message={"Where do you prefer to stay?"} /></div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94A3B8",
                      fontWeight: 600,
                    }}
                  >
                    {getStayLabel()}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    padding: "4px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    gap: "4px",
                  }}
                >
                  {STAY_TRACK.map((stay) => {
                    const isSelected =
                      preferences.accommodation_style === stay.id;
                    const Icon = stay.icon;
                    return (
                      <button
                        key={stay.id}
                        type="button"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            accommodation_style: stay.id,
                          })
                        }
                        style={{
                          padding: "10px 6px",
                          borderRadius: "10px",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "transparent",
                          border: isSelected
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid transparent",
                          color: isSelected ? "#FBBF24" : "#94A3B8",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={12} />
                        <span><LocalizedText>{stay.label}</LocalizedText></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Getting Around */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}
                  ><LocalizedText message={"How do you prefer to get around?"} /></div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94A3B8",
                      fontWeight: 600,
                    }}
                  >
                    {getTransitLabel()}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    padding: "4px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    gap: "4px",
                  }}
                >
                  {TRANSIT_TRACK.map((transit) => {
                    const isSelected = preferences.transit_style === transit.id;
                    const Icon = transit.icon;
                    return (
                      <button
                        key={transit.id}
                        type="button"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            transit_style: transit.id,
                          })
                        }
                        style={{
                          padding: "10px 6px",
                          borderRadius: "10px",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "transparent",
                          border: isSelected
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid transparent",
                          color: isSelected ? "#FBBF24" : "#94A3B8",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={12} />
                        <span><LocalizedText>{transit.label}</LocalizedText></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Budget & Travel Party */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Budget */}
                <div
                  style={{
                    padding: "22px 24px",
                    borderRadius: "20px",
                    backgroundColor: "#121418",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      marginBottom: "12px",
                    }}
                  ><LocalizedText message={"Budget Level"} /></div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      padding: "4px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      gap: "4px",
                    }}
                  >
                    {BUDGET_TRACK.map((b) => {
                      const isSelected = preferences.budget_tier === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setPreferences({
                              ...preferences,
                              budget_tier: b.id,
                            })
                          }
                          style={{
                            padding: "8px 4px",
                            borderRadius: "8px",
                            backgroundColor: isSelected
                              ? "rgba(245, 158, 11, 0.2)"
                              : "transparent",
                            border: isSelected
                              ? "1px solid rgba(245, 158, 11, 0.4)"
                              : "1px solid transparent",
                            color: isSelected ? "#FBBF24" : "#94A3B8",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div>{b.badge}</div>
                          <div style={{ fontSize: "10px", marginTop: "1px" }}>
                            <LocalizedText>{b.label}</LocalizedText>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Party */}
                <div
                  style={{
                    padding: "22px 24px",
                    borderRadius: "20px",
                    backgroundColor: "#121418",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      marginBottom: "12px",
                    }}
                  ><LocalizedText message={"Traveling With"} /></div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      padding: "4px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      gap: "4px",
                    }}
                  >
                    {PARTY_TRACK.map((p) => {
                      const isSelected = preferences.party_type === p.id;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setPreferences({ ...preferences, party_type: p.id })
                          }
                          style={{
                            padding: "8px 4px",
                            borderRadius: "8px",
                            backgroundColor: isSelected
                              ? "rgba(245, 158, 11, 0.2)"
                              : "transparent",
                            border: isSelected
                              ? "1px solid rgba(245, 158, 11, 0.4)"
                              : "1px solid transparent",
                            color: isSelected ? "#FBBF24" : "#94A3B8",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "3px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Icon size={12} />
                          <span><LocalizedText>{p.label}</LocalizedText></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 6. Food Preferences */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    marginBottom: "14px",
                    letterSpacing: "-0.01em",
                  }}
                ><LocalizedText message={"Food & Dietary Preferences"} /></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {DIETARY_CHIPS.map((diet) => {
                    const isSelected = (preferences.dietary || []).includes(
                      diet,
                    );
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => toggleDiet(diet)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "9999px",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "rgba(255, 255, 255, 0.04)",
                          border: isSelected
                            ? "1px solid #F59E0B"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isSelected ? "#FBBF24" : "#CBD5E1",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span><LocalizedText>{diet}</LocalizedText></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Extra Notes */}
              <div
                style={{
                  padding: "24px 26px",
                  borderRadius: "20px",
                  backgroundColor: "#121418",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
              >
                <TravellerSupportEditor personal value={preferences.personal_support?[{...preferences.personal_support,traveller:1}]:[]} onChange={rows=>setPreferences(previous=>({...previous,personal_support:rows[0]||null}))}/>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    marginBottom: "6px",
                    letterSpacing: "-0.01em",
                  }}
                ><LocalizedText message={"Anything else we should know?"} /></div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    margin: "0 0 12px 0",
                  }}
                ><LocalizedText message={"Any specific requests (like quiet rooms, ocean views, or kid-friendly venues)?"} /></p>

                <Localized element={"input"} attributes={["placeholder"]}
                  type="text"
                  placeholder="e.g. I prefer quiet mornings, high floors with sea views, and great coffee spots."
                  value={preferences.custom_notes || ""}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      custom_notes: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(10, 11, 14, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#F59E0B")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(255, 255, 255, 0.1)")
                  }
                />
              </div>
            </div>

            {/* ── RIGHT: Simple & Friendly Profile Card ── */}
            <div
              style={{
                position: "sticky",
                top: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  borderRadius: "26px",
                  background:
                    "linear-gradient(145deg, rgba(24, 26, 34, 0.95) 0%, rgba(14, 16, 22, 0.98) 100%)",
                  backdropFilter: "blur(32px)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  padding: "30px",
                  boxShadow:
                    "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "22px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Subtle Ambient Gold Glow in Background */}
                <div
                  style={{
                    position: "absolute",
                    top: "-40px",
                    right: "-40px",
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Top Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Localized element={"img"} attributes={["alt"]}
                      src="/MasarAiLogo.png"
                      alt="Masar AI"
                      style={{
                        height: "38px",
                        width: "auto",
                        objectFit: "contain",
                        filter:
                          "drop-shadow(0 2px 10px rgba(245, 158, 11, 0.5))",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#FFFFFF",
                          letterSpacing: "0.02em",
                        }}
                      ><LocalizedText message={"MASAR AI"} /></div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#FBBF24",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                        }}
                      ><LocalizedText message={"YOUR TRAVEL PROFILE"} /></div>
                    </div>
                  </div>
                </div>

                {/* Friendly Traveler Style */}
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "4px",
                    }}
                  ><LocalizedText message={"Your Style"} /></div>
                  <h3
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      margin: "0 0 6px 0",
                      lineHeight: 1.25,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {travelStyle.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#CBD5E1",
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    <LocalizedText>{travelStyle.tagline}</LocalizedText>
                  </p>
                </div>

                {/* Simple 2x2 Summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(10, 11, 14, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    ><LocalizedText message={"Pace"} /></div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#FBBF24",
                        fontWeight: 700,
                        marginTop: "2px",
                      }}
                    >
                      {getPaceLabel()}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    ><LocalizedText message={"Budget"} /></div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#34D399",
                        fontWeight: 700,
                        marginTop: "2px",
                      }}
                    >
                      {getBudgetLabel()}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    ><LocalizedText message={"Stay Style"} /></div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#FFFFFF",
                        fontWeight: 600,
                        marginTop: "2px",
                      }}
                    >
                      {getStayLabel()}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    ><LocalizedText message={"Getting Around"} /></div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#FFFFFF",
                        fontWeight: 600,
                        marginTop: "2px",
                      }}
                    >
                      {getTransitLabel()}
                    </div>
                  </div>
                </div>

                {/* Primary Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: "100%",
                    padding: "13px 20px",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                    border: "none",
                    color: "#0A0B0E",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 18px rgba(245, 158, 11, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span><LocalizedText message={"Saving Preferences..."} /></span>
                    </>
                  ) : (
                    <>
                      <Save size={15} strokeWidth={2.5} />
                      <span><LocalizedText message={"Save Preferences"} /></span>
                    </>
                  )}
                </button>

                {/* Link to Chat */}
                <Link
                  href="/chat"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#94A3B8",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <span><LocalizedText message={"Start planning in Chat"} /></span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <ProtectedRoute>
      <PreferencesContent />
    </ProtectedRoute>
  );
}
