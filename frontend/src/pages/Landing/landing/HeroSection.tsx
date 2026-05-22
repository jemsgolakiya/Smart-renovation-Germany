import { Button } from "../ui/button";
import { Play, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  backgroundImage: string;
}

export function HeroSection({ backgroundImage }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative bg-gradient-to-br from-emerald-50 to-blue-50 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <img
          src={backgroundImage}
          alt="Home renovation"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="max-w-3xl">
          <h1 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Your Smart Assistant for Home Renovation and Financing in Germany
          </h1>
          <p className="text-gray-700 mb-6 sm:mb-8 text-base sm:text-lg md:text-xl leading-relaxed">
            Plan your renovation, discover funding, and manage every step with
            AI guidance.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Button
              onClick={() => navigate("/planning")}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              size="lg"
            >
              Start Planning
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements - hidden on mobile */}
      <div className="hidden md:block absolute top-20 right-20 w-48 md:w-72 h-48 md:h-72 bg-emerald-200 rounded-full blur-3xl opacity-20"></div>
      <div className="hidden md:block absolute bottom-20 left-20 w-64 md:w-96 h-64 md:h-96 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
    </section>
  );
}
