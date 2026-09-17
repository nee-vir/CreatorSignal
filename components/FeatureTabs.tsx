'use client';

import React from 'react';
import {
  Search,
  Layers,
  Flame,
  Activity,
  Compass,
  Wand2,
} from 'lucide-react';

interface FeatureTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function FeatureTabs({ activeTab, setActiveTab }: FeatureTabsProps) {
  const tools = [
    {
      id: 'universal',
      label: 'Universal Audit',
      description: 'Video & Channel Scanner',
      icon: Search,
      badge: 'POPULAR',
    },
    {
      id: 'serp',
      label: 'Thumbnail Tester',
      description: 'SERP Live Preview',
      icon: Layers,
    },
    {
      id: 'outlier',
      label: 'Viral Topic Finder',
      description: 'Outlier Multipliers',
      icon: Flame,
    },
    {
      id: 'vph',
      label: 'Speedometer',
      description: 'Views / Hour Velocity',
      icon: Activity,
    },
    {
      id: 'evergreen',
      label: 'Evergreen Ideas',
      description: 'Low-Comp Search Gaps',
      icon: Compass,
    },
    {
      id: 'angle',
      label: 'Angle Pivot AI',
      description: 'Viral Hook Scripts',
      icon: Wand2,
      badge: 'AI',
    },
  ];

  return (
    <div className="w-full my-8">
      {/* Centered Minimalist Tool Dock */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 block">
          Platform Studio Tools
        </span>

        <div className="w-full max-w-4xl bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
          {tools.map((tool) => {
            const isActive = activeTab === tool.id;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                id={`feature-tab-${tool.id}`}
                onClick={() => setActiveTab(tool.id)}
                className={`px-3 py-2.5 rounded-xl transition-all flex flex-col items-center justify-center text-center relative ${
                  isActive
                    ? 'bg-white text-rose-600 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                }`}
              >
                {tool.badge && (
                  <span
                    className={`absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      tool.badge === 'AI'
                        ? 'bg-purple-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
                <Icon
                  className={`w-4 h-4 mb-1 transition-colors ${
                    isActive ? 'text-rose-600' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-bold leading-tight line-clamp-1">
                  {tool.label}
                </span>
                <span className="text-[9px] text-slate-600 font-normal hidden md:inline leading-none mt-0.5">
                  {tool.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
