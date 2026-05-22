import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LandingNavigationProps {
  onLogin?: () => void;
  onGetStarted?: () => void;
}

const menuItems = ['Home', 'Features', 'How It Works', 'About', 'Contact'];

export function LandingNavigation({ onLogin, onGetStarted }: LandingNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-emerald-600 font-bold text-lg sm:text-xl md:text-2xl">
            <span className="hidden sm:inline">RenovAlteGermany</span>
            <span className="sm:hidden">RenovAlte</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {menuItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm xl:text-base text-gray-700 hover:text-emerald-600 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={onLogin}
              className="text-sm sm:text-base px-3 sm:px-4"
            >
              Login
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base px-3 sm:px-4"
              onClick={onGetStarted}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4 animate-fadeIn">
            <div className="flex flex-col space-y-3">
              {menuItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-emerald-600 py-2 transition-colors"
                >
                  {item}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogin?.();
                  }}
                  className="w-full"
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onGetStarted?.();
                  }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
