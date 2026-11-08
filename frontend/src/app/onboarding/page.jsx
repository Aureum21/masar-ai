"use client";
import {useI18n} from '@/i18n/LocaleProvider';
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import {APP_HOME} from "@/config/navigation";

import { API_BASE } from '@/lib/api';
import { normalisePreferences } from '@/utils/preferences';

import { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Crown, 
  Gem, 
  Coffee, 
  Activity, 
  Zap, 
  Landmark, 
  UtensilsCrossed, 
  Palmtree, 
  ShoppingBag, 
  Car, 
  Music, 
  Building2, 
  Castle, 
  Home, 
  CheckCircle2, 
  Leaf, 
  Salad, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Award,
  Wallet,
  SunMedium,
  Luggage,
  SlidersHorizontal
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const BUDGET_OPTIONS = [
  {
    id: "Budget",
    title: "Budget-Friendly",
    description: "Great value, authentic spots & smart stays",
    icon: Wallet
  },
  {
    id: "Standard",
    title: "Premium",
    description: "4 to 5-star comfort, central locations & top dining",
    icon: Award
  },
  {
    id: "Luxury",
    title: "Luxury",
    description: "5-star luxury suites, VIP access & private transfers",
    icon: Crown
  }
];

const PACE_OPTIONS = [
  {
    id: "Relaxed",
    title: "Relaxed",
    description: "Slow mornings, beach time & peaceful dinners",
    icon: Coffee
  },
  {
    id: "Moderate",
    title: "Balanced",
    description: "A good mix of exploring and relaxing time",
    icon: Activity
  },
  {
    id: "Fast-paced",
    title: "Fast-Paced",
    description: "Action-packed days seeing as much as possible",
    icon: Zap
  }
];

const INTEREST_OPTIONS = [
  { id: "Culture & Heritage", label: "History & Culture", subtitle: "Souks, museums & old town", icon: Landmark },
  { id: "Fine Dining", label: "Food & Dining", subtitle: "Top restaurants & local cuisine", icon: UtensilsCrossed },
  { id: "Beach & Sun", label: "Beaches & Water", subtitle: "Beach clubs, yachts & pools", icon: Palmtree },
  { id: "Desert Safaris", label: "Desert Safari", subtitle: "Dune drives & desert camps", icon: SunMedium },
  { id: "Shopping", label: "Shopping", subtitle: "Famous malls & local markets", icon: ShoppingBag },
  { id: "Adventure", label: "Thrills & Fun", subtitle: "Theme parks & outdoor sports", icon: Car },
  { id: "Nightlife", label: "Nightlife", subtitle: "Rooftop lounges & evening spots", icon: Music }
];

const ACCOMMODATION_OPTIONS = [
  { id: "Resort", label: "Beach Resort", icon: Palmtree },
  { id: "City Hotel", label: "City Hotel", icon: Building2 },
  { id: "Boutique", label: "Desert Resort", icon: Castle },
  { id: "Apartment", label: "Private Villa", icon: Home }
];

const DIETARY_OPTIONS = [
  { id: "Halal", label: "Halal", icon: CheckCircle2 },
  { id: "Vegan", label: "Vegan", icon: Leaf },
  { id: "Vegetarian", label: "Vegetarian", icon: Salad },
  { id: "Gluten-Free", label: "Gluten-Free", icon: ShieldCheck }
];

function OnboardingContent() {
  const {t}=useI18n();
  const { token, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [preferences, setPreferences] = useState({
    budget_tier: "Standard",
    preferred_pace: "Moderate",
    interests: ["Fine Dining", "Beach & Sun"],
    accommodation_style: "Resort",
    dietary_restrictions: ["Halal"],
    accessibility_needs: ["None"]
  });

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && token) {
      fetch(`${API_BASE}/api/v1/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.travel_preferences && Object.keys(data.travel_preferences).length > 0) {
          setPreferences(prev => ({ ...prev, ...normalisePreferences(data.travel_preferences) }));
        }
      })
      .catch(err => console.error("Error fetching preferences:", err))
      .finally(() => setLoading(false));
    }
  }, [isEditMode, token]);

  const personaTitle = useMemo(() => {
    const isLux = preferences.budget_tier === "Luxury";
    const hasDesert = preferences.interests.includes("Desert Safaris");
    const hasDining = preferences.interests.includes("Fine Dining");
    const hasBeach = preferences.interests.includes("Beach & Sun");
    const isFast = preferences.preferred_pace === "Fast-paced";

    if (isLux && hasDining) return "Luxury Food & Leisure";
    if (hasDesert) return "Desert Explorer";
    if (isFast) return "High-Energy Adventurer";
    if (hasBeach) return "Beach & Coast Traveler";
    if (isLux) return "VIP Luxury Traveler";
    return "Curated Explorer";
  }, [preferences]);

  const toggleInterest = (interestId) => {
    setPreferences(prev => {
      const exists = prev.interests.includes(interestId);
      const updated = exists 
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId];
      return { ...prev, interests: updated };
    });
  };

  const toggleDietary = (dietId) => {
    setPreferences(prev => {
      const exists = prev.dietary_restrictions.includes(dietId);
      const updated = exists 
        ? prev.dietary_restrictions.filter(id => id !== dietId)
        : [...prev.dietary_restrictions, dietId];
      return { ...prev, dietary_restrictions: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ travel_preferences: normalisePreferences(preferences) });
      if (isEditMode) {
        router.push("/profile");
      } else {
        router.push(APP_HOME);
      }
    } catch (err) {
      console.error(err);
      alert(t("Failed to save preferences. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0A0B0E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A0AEC0'
      }}>
      <LanguageSwitcher className="page-language-switcher"/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Luggage size={20} color="#F59E0B" className="animate-pulse" />
          <span><LocalizedText message={"Loading your preferences..."} /></span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#0A0B0E',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245, 158, 11, 0.15), transparent), radial-gradient(circle at 50% 100%, rgba(18, 20, 24, 1), #0A0B0E)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative'
    }}>

      <LanguageSwitcher className="page-language-switcher"/>
      {/* Top Bar Navigation */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        {isEditMode ? (
          <Link href="/profile/account" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#A0AEC0',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.2s'
          }}>
            <ArrowLeft size={14} />
            <span><LocalizedText message={"Return to Profile"} /></span>
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Localized element={"img"} attributes={["alt"]}
              src="/MasarAiLogo.png" 
              alt="Masar AI" 
              style={{ height: '30px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.45))' }}
            />
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}><LocalizedText message={"Masar AI "} /><span style={{ color: '#F59E0B', fontWeight: 500 }}><LocalizedText message={"Travel Setup"} /></span>
            </span>
          </div>
        )}

        {/* Live Persona Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#FBBF24',
          fontSize: '12px',
          fontWeight: 700
        }}>
          <Gem size={13} color="#FBBF24" />
          <span>{personaTitle}</span>
        </div>
      </div>

      {/* Main Glass Card with Scrollable Body & Docked Footer */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: 'calc(100vh - 110px)',
        backgroundColor: 'rgba(18, 20, 24, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(245, 158, 11, 0.22)',
        borderRadius: '24px',
        padding: '28px 32px 24px 32px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.14)',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* ── Fixed Card Header ── */}
        <div style={{ flexShrink: 0, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em' }}><LocalizedText message={"Step ⟦0⟧ of ⟦1⟧"} values={[step,totalSteps]} /></span>
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
              <LocalizedText>{step === 1 && "Trip Style & Budget"}</LocalizedText>
              <LocalizedText>{step === 2 && "Activities & Stays"}</LocalizedText>
              <LocalizedText>{step === 3 && "Food & Summary"}</LocalizedText>
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(step / totalSteps) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* ── Scrollable Card Body (Content Never Clips Buttons) ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingInlineEnd: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>

          {/* ── STEP 1: Trip Style & Budget ── */}
          {step === 1 && (
            <>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}><LocalizedText message={"What's your trip budget?"} /></h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"This helps our AI recommend the right hotels and activities for you."} /></p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px' }}>
                  {BUDGET_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.budget_tier === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setPreferences({ ...preferences, budget_tier: opt.id })}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '14px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'rgba(10, 11, 14, 0.7)',
                          border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isSelected ? '0 0 14px rgba(245, 158, 11, 0.2)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            padding: '6px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isSelected ? '#F59E0B' : '#94A3B8'
                          }}>
                            <Icon size={16} />
                          </div>
                          {isSelected && (
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: '#F59E0B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0A0B0E'
                            }}>
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#FFFFFF' : '#E2E8F0' }}>
                          <LocalizedText>{opt.title}</LocalizedText>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.35 }}>
                          <LocalizedText>{opt.description}</LocalizedText>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}><LocalizedText message={"How fast do you like to travel?"} /></h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"Choose the pace that feels most comfortable."} /></p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
                  {PACE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.preferred_pace === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setPreferences({ ...preferences, preferred_pace: opt.id })}
                        style={{
                          padding: '14px',
                          borderRadius: '14px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'rgba(10, 11, 14, 0.7)',
                          border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#F59E0B' : '#94A3B8',
                          flexShrink: 0
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#FFFFFF' : '#E2E8F0' }}>
                            <LocalizedText>{opt.title}</LocalizedText>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            <LocalizedText>{opt.description}</LocalizedText>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Activities & Stays ── */}
          {step === 2 && (
            <>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}><LocalizedText message={"What do you enjoy doing?"} /></h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"Select all that interest you for your trip."} /></p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginTop: '12px' }}>
                  {INTEREST_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.interests.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleInterest(opt.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.14)' : 'rgba(10, 11, 14, 0.7)',
                          border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#F59E0B' : '#94A3B8',
                          flexShrink: 0
                        }}>
                          <Icon size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#FFFFFF' : '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <LocalizedText>{opt.label}</LocalizedText>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {opt.subtitle}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#F59E0B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0A0B0E',
                            flexShrink: 0
                          }}>
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}><LocalizedText message={"Where do you prefer to stay?"} /></h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"Pick your favorite type of accommodation."} /></p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '10px' }}>
                  {ACCOMMODATION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.accommodation_style === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setPreferences({ ...preferences, accommodation_style: opt.id })}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.14)' : 'rgba(10, 11, 14, 0.7)',
                          border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#F59E0B' : '#94A3B8',
                          flexShrink: 0
                        }}>
                          <Icon size={15} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#FFFFFF' : '#E2E8F0' }}>
                          <LocalizedText>{opt.label}</LocalizedText>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 3: Food & Summary ── */}
          {step === 3 && (
            <>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}><LocalizedText message={"Any food preferences?"} /></h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"We will make sure your dining recommendations respect your needs."} /></p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {DIETARY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.dietary_restrictions.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleDietary(opt.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '9999px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.16)' : 'rgba(10, 11, 14, 0.7)',
                          border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#FBBF24' : '#E2E8F0',
                          fontSize: '13px',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Icon size={14} color={isSelected ? '#FBBF24' : '#94A3B8'} />
                        <span><LocalizedText>{opt.label}</LocalizedText></span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ready Summary Card */}
              <div style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0A0B0E',
                  flexShrink: 0
                }}>
                  <Crown size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}><LocalizedText message={"Your Travel Style"} /></div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                    {personaTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}><LocalizedText message={"Masar AI will automatically tailor every itinerary to your ⟦0⟧ budget and ⟦1⟧ pace."} values={[preferences.budget_tier.toLowerCase(),preferences.preferred_pace.toLowerCase()]} /></div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── Fixed Card Footer (Always Visible & Pinned) ── */}
        <div style={{
          flexShrink: 0,
          marginTop: '18px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#E2E8F0',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ArrowLeft size={15} />
              <span><LocalizedText message={"Back"} /></span>
            </button>
          ) : (
            <div>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => router.push(APP_HOME)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                ><LocalizedText message={"Skip for now"} /></button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={nextStep}
            disabled={saving}
            style={{
              padding: '11px 24px',
              borderRadius: '10px',
              backgroundColor: '#F59E0B',
              backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
              color: '#0A0B0E',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.8 : 1,
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.15s'
            }}
          >
            <span><LocalizedText>{saving ? "Saving..." : step === totalSteps ? (isEditMode ? "Save Preferences" : "Save & Go to Chat") : "Continue"}</LocalizedText></span>
            {!saving && <ArrowRight size={15} />}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0' }}><LocalizedText message={"Loading Preferences..."} /></div>
      }>
        <OnboardingContent />
      </Suspense>
    </ProtectedRoute>
  );
}
