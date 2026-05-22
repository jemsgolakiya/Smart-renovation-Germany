import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-emerald-600 to-emerald-700 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto px-8 text-center relative">
        <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Start Your Journey Today</span>
        </div>

        <h2 className="text-white mb-6">
          Ready to Begin Your Renovation Journey?
        </h2>
        <p className="text-emerald-50 text-lg mb-8">
          Join thousands of German homeowners who trust RenovAlteGermany to make
          their renovation dreams a reality.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="lg"
            className="bg-white text-emerald-700 hover:bg-gray-100"
          >
            Try RenovAlteGermany Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white hover:bg-white/10"
          >
            Schedule a Demo
          </Button>
        </div>

        <p className="text-emerald-100 text-sm mt-6">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}
