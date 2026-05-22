import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Maria Schneider',
    location: 'Berlin',
    rating: 5,
    text: 'Helped me organize my renovation in half the time! The AI assistant made finding KfW funding so much easier.',
    initials: 'MS',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 2,
    name: 'Thomas Weber',
    location: 'Munich',
    rating: 5,
    text: 'Outstanding platform! The permit checklist and timeline features saved us from costly delays.',
    initials: 'TW',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 3,
    name: 'Anna Fischer',
    location: 'Hamburg',
    rating: 5,
    text: 'As a first-time renovator, I was overwhelmed. RenovAlteGermany guided me through every step with confidence.',
    initials: 'AF',
    color: 'bg-purple-100 text-purple-700',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="mb-4">Trusted by Homeowners Across Germany</h2>
          <p className="text-gray-600 text-lg">
            Join thousands of satisfied users who successfully completed their renovations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className={testimonial.color}>
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-600">{testimonial.location}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
