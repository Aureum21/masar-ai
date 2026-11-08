"use client";
import {Localized,LocalizedText} from '@/i18n/Localized';


import Link from "next/link";
import { MessageSquare, Sparkles, Map, Calendar, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-[#ffffff10] sticky top-0 bg-[#0b0c10]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png" 
            alt="Masar AI" 
            className="h-10 w-auto drop-shadow-[0_2px_12px_rgba(245,158,11,0.45)]" 
          />
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white to-amber-500 bg-clip-text text-transparent"><LocalizedText message={"Masar AI"} /></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors"><LocalizedText message={"Log in"} /></Link>
          <Link href="/signup" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(245,158,11,0.3)]"><LocalizedText message={"Get Started"} /></Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
          <div className="mb-8 p-1 rounded-full bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/20">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a1c23]">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-xs font-medium text-amber-500 tracking-wide uppercase"><LocalizedText message={"The Future of UAE Travel"} /></span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight"><LocalizedText message={"Discover the Emirates with "} /><br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700 bg-clip-text text-transparent"><LocalizedText message={"Intelligent Precision"} /></span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl font-light"><LocalizedText message={"Your premium AI concierge. Experience curated itineraries, exclusive bookings, and seamless logistics across Dubai, Abu Dhabi, and beyond."} /></p>
          
          <Link href="/signup" className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-lg font-bold text-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)]"><LocalizedText message={"Start Your Journey"} /><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* How it Works Section */}
      <section className="py-24 bg-[#12141a] border-t border-[#ffffff05] relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4"><LocalizedText message={"How Masar AI Works"} /></h2>
            <p className="text-gray-400"><LocalizedText message={"A seamless experience from inspiration to destination."} /></p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#1a1c23] border border-[#333] rounded-2xl p-8 hover:border-amber-500/50 transition-colors">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <MessageSquare className="text-amber-500" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white"><LocalizedText message={"1. Describe Your Vibe"} /></h3>
              <p className="text-gray-400 text-sm leading-relaxed"><LocalizedText message={"Tell us what you're looking for. Whether it's a luxury desert retreat, a culinary tour of Dubai, or cultural immersion in Sharjah."} /></p>
            </div>
            
            <div className="bg-[#1a1c23] border border-[#333] rounded-2xl p-8 hover:border-amber-500/50 transition-colors">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <Map className="text-amber-500" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white"><LocalizedText message={"2. Generative Canvas"} /></h3>
              <p className="text-gray-400 text-sm leading-relaxed"><LocalizedText message={"Watch as our multi-agent system streams tailored hotel options, event tickets, and logistical routes directly into an interactive UI."} /></p>
            </div>
            
            <div className="bg-[#1a1c23] border border-[#333] rounded-2xl p-8 hover:border-amber-500/50 transition-colors">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <Calendar className="text-amber-500" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white"><LocalizedText message={"3. Book & Manage"} /></h3>
              <p className="text-gray-400 text-sm leading-relaxed"><LocalizedText message={"Confirm your bookings with one click. Manage your entire itinerary, secure pre-bookings, and access tickets from your dashboard."} /></p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 border-t border-[#ffffff05]">
        <p><LocalizedText message={"© 2026 Masar AI. Designed in the UAE."} /></p>
      </footer>
    </div>
  );
}
