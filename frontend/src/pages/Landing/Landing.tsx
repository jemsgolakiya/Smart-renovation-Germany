import { LandingNavigation } from './landing/LandingNavigation';
import { HeroSection } from './landing/HeroSection';
import { FeatureCards } from './landing/FeatureCards';
import { AICompanionSection } from './landing/AICompanionSection';
import { WorkflowSection } from './landing/WorkflowSection';
import { TestimonialsSection } from './landing/TestimonialsSection';
import { CTASection } from './landing/CTASection';
import { Footer } from './landing/Footer';
import { useNavigate } from 'react-router-dom';


const LandingPage: React.FC = () => {
  const heroImage = "https://images.unsplash.com/photo-1761353854314-4bda99811659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob21lJTIwcmVub3ZhdGlvbnxlbnwxfHx8fDE3NjE2ODAzNDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation onLogin={() => navigate("/login")} onGetStarted={() => navigate("/register")} />
      <HeroSection backgroundImage={heroImage} />
      <FeatureCards />
      <AICompanionSection />
      <WorkflowSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
export default LandingPage;
