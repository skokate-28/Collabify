import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, Shield, Sparkles, MessageSquare, FileText, 
  ArrowRight, FolderKanban, CheckCircle2, Star, Globe, Users 
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <FolderKanban className="text-indigoAccent" size={24} />,
      title: "Real-Time Kanban Boards",
      desc: "Drag, drop, and organize tasks instantly. Changes sync in real-time across your entire team."
    },
    {
      icon: <FileText className="text-pink-500" size={24} />,
      title: "Collaborative Docs",
      desc: "Write together with rich markdown formatting, typing indicators, and real-time multiplayer cursors."
    },
    {
      icon: <Sparkles className="text-amber-500" size={24} />,
      title: "Groq AI Board Summaries",
      desc: "Generate smart executive summaries of your board columns to highlight bottlenecks and next steps."
    },
    {
      icon: <Zap className="text-cyan-400" size={24} />,
      title: "Daily Due Reminders",
      desc: "Never miss a deadline with automatically scheduled reminders for tasks due tomorrow."
    },
    {
      icon: <Users className="text-emerald-400" size={24} />,
      title: "Granular Member Roles",
      desc: "Assign members as admins, members, or viewers to control editing permissions."
    },
    {
      icon: <Shield className="text-indigo-400" size={24} />,
      title: "Secure Session Auth",
      desc: "Enterprise-ready HTTP-only cookies protect sessions against XSS and cross-site scripting."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Create a Workspace",
      desc: "Set up a central hub for your team and organize your work in one place."
    },
    {
      num: "02",
      title: "Invite Your Team",
      desc: "Share your secure 8-character invite code to instantly add collaborators."
    },
    {
      num: "03",
      title: "Build & Collaborate",
      desc: "Manage tasks, write documentation, and review board summaries in real-time."
    }
  ];

  return (
    <div className="bg-[#0D0E11] text-gray-200 min-h-screen font-dmsans">
      {/* Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0D0E11]/80 border-b border-[#2A2D35]/50 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigoAccent flex items-center justify-center text-white font-bold font-sora shadow-md shadow-indigoAccent/20">
            C
          </div>
          <span className="font-sora font-bold text-white text-base tracking-wider">
            Collabify
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link 
            to="/register" 
            className="text-xs font-semibold bg-indigoAccent hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-indigoAccent/10 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigoAccent/10 border border-indigoAccent/20 text-indigoAccent text-xs font-semibold mb-6 select-none animate-pulse">
          <Sparkles size={12} />
          <span>Introducing AI Board Summaries</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-sora font-extrabold text-white tracking-tight leading-tight max-w-4xl">
          Your team's <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigoAccent via-purple-400 to-pink-500">second brain</span>.
        </h1>
        <p className="text-sm md:text-base text-gray-400 mt-6 max-w-2xl leading-relaxed">
          Manage boards, draft real-time markdown documentation, track daily targets, and let Groq AI map out your bottlenecks in one cohesive dark interface.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link 
            to="/register" 
            className="bg-indigoAccent hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigoAccent/20 active:scale-95"
          >
            Get Started Free
            <ArrowRight size={14} />
          </Link>
          <a 
            href="#features" 
            className="bg-[#16181D] hover:bg-[#2A2D35]/50 border border-[#2A2D35] text-white font-semibold text-xs px-6 py-3.5 rounded-lg transition-all active:scale-95"
          >
            Explore Features
          </a>
        </div>

        {/* Mockup Showcase */}
        <div className="w-full max-w-4xl mt-16 p-2 bg-[#16181D] border border-[#2A2D35] rounded-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-indigoAccent/5 to-transparent pointer-events-none" />
          {/* Mockup Title bar */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#2A2D35] bg-[#1E2028]/50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-gray-500 ml-4 font-mono font-medium">project-roadmap.collabify.com</span>
          </div>
          {/* Mockup Content - Kanban columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-[#0D0E11] text-left">
            {/* Column 1 */}
            <div className="bg-[#16181D] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-400/10 w-fit select-none">TODO</span>
              <div className="bg-[#1E2028] border border-[#2A2D35] p-3.5 rounded-lg flex flex-col gap-2 shadow-sm">
                <span className="text-xs font-semibold text-white">OAuth Auth Logic</span>
                <p className="text-[10px] text-gray-500">Configure HTTP-only tokens and refresh flows.</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">High</span>
                  <div className="w-5 h-5 rounded-full bg-indigoAccent flex items-center justify-center text-[9px] font-semibold text-white">US</div>
                </div>
              </div>
            </div>
            {/* Column 2 */}
            <div className="bg-[#16181D] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-orange-400 bg-orange-400/5 px-2 py-0.5 rounded border border-orange-400/10 w-fit select-none">IN PROGRESS</span>
              <div className="bg-[#1E2028] border border-[#2A2D35] p-3.5 rounded-lg flex flex-col gap-2 shadow-sm">
                <span className="text-xs font-semibold text-white">Collaborative Document Sync</span>
                <p className="text-[10px] text-gray-500">Enable typing debounces and live multi-cursor events.</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">Medium</span>
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[9px] font-semibold text-white">JD</div>
                </div>
              </div>
            </div>
            {/* Column 3 */}
            <div className="bg-[#16181D] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10 w-fit select-none">DONE</span>
              <div className="bg-[#1E2028] border border-[#2A2D35] p-3.5 rounded-lg flex flex-col gap-2 shadow-sm">
                <span className="text-xs font-semibold text-white">Design Token Mapping</span>
                <p className="text-[10px] text-gray-500">Synchronize colors, sizes, and font configurations.</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Low</span>
                  <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-[9px] font-semibold text-white">MK</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-[#2A2D35]/30 bg-[#16181D]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-sora font-bold text-white">Supercharge your product lifecycle</h2>
            <p className="text-xs text-gray-500 mt-3">Collabify brings planning, writing, tracking, and AI automation into a unified dark workspace.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="bg-[#16181D] border border-[#2A2D35] rounded-xl p-6 hover:border-indigoAccent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 shadow-sm"
              >
                <div className="p-2.5 bg-[#1E2028] border border-[#2A2D35] rounded-lg w-fit">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-sora font-semibold text-white">{feat.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-sora font-bold text-white">Getting started is simple</h2>
            <p className="text-xs text-gray-500 mt-3">Follow these three steps to align your engineering workflows.</p>
          </div>
          <div className="relative flex flex-col md:flex-row gap-8 justify-between max-w-5xl mx-auto">
            {/* Dashed connector line */}
            <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] border-t border-dashed border-[#2A2D35] hidden md:block z-0" />
            
            {steps.map((st, idx) => (
              <div 
                key={idx} 
                className="relative bg-[#16181D] border border-[#2A2D35] rounded-xl p-6 flex-1 flex flex-col gap-4 z-10 text-center md:text-left"
              >
                <div className="text-2xl font-sora font-black text-indigoAccent/20 leading-none">
                  {st.num}
                </div>
                <h3 className="text-sm font-semibold text-white">{st.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-indigoAccent/10 to-purple-500/10 border border-indigoAccent/20 rounded-2xl p-10 md:p-14 text-center flex flex-col items-center gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigoAccent/5 blur-3xl rounded-full" />
          <h2 className="text-2xl md:text-4xl font-sora font-bold text-white relative z-10 leading-tight">
            Ready to experience real-time engineering work?
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl relative z-10 leading-relaxed">
            Create your workspace today, invite your team, and build with live multi-player markdown documents and boards.
          </p>
          <Link 
            to="/register" 
            className="bg-indigoAccent hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigoAccent/20 relative z-10 active:scale-95"
          >
            Get Started For Free
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2D35]/30 py-12 bg-[#0D0E11] px-6 text-center text-xs text-gray-500 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigoAccent flex items-center justify-center text-white font-bold font-sora text-xs">
            C
          </div>
          <span className="font-sora font-bold text-white tracking-wider">
            Collabify
          </span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} Collabify Inc. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Security</a>
        </div>
      </footer>
    </div>
  );
}
