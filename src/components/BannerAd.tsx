"use client";

import { useState } from "react";

interface BannerAdProps {
  position?: 'top' | 'bottom' | 'sidebar';
  className?: string;
}

export default function BannerAd({ position = 'sidebar', className = '' }: BannerAdProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const ads = [
    {
      title: "🎓 Master Your Studies",
      description: "Get premium access to unlimited quizzes and advanced analytics",
      cta: "Upgrade Now",
      color: "bg-gradient-to-r from-blue-500 to-purple-600",
      textColor: "text-white"
    },
    {
      title: "📚 Study Smarter",
      description: "Join thousands of students improving their grades",
      cta: "Learn More",
      color: "bg-gradient-to-r from-green-500 to-teal-600",
      textColor: "text-white"
    },
    {
      title: "⚡ Boost Performance",
      description: "Advanced quiz features and detailed progress tracking",
      cta: "Try Premium",
      color: "bg-gradient-to-r from-orange-500 to-red-600",
      textColor: "text-white"
    }
  ];

  const randomAd = ads[Math.floor(Math.random() * ads.length)];

  const getAdDimensions = () => {
    switch (position) {
      case 'top':
        return 'w-full h-24';
      case 'bottom':
        return 'w-full h-20';
      case 'sidebar':
      default:
        return 'w-full h-48';
    }
  };

  return (
    <div className={`${getAdDimensions()} ${className} relative overflow-hidden rounded-lg shadow-lg`}>
      <div className={`${randomAd.color} h-full flex flex-col justify-between p-4 ${randomAd.textColor}`}>
        <div>
          <h3 className="font-bold text-lg mb-2">{randomAd.title}</h3>
          <p className="text-sm opacity-90">{randomAd.description}</p>
        </div>
        <div className="flex justify-between items-center">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200">
            {randomAd.cta}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white text-opacity-70 hover:text-opacity-100 transition-opacity"
            title="Close ad"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Ad indicator */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-20 text-white text-xs px-2 py-1 rounded">
        Ad
      </div>
    </div>
  );
}
