import { ClipboardList, Euro, FileCheck, Users, Wrench, FileText } from 'lucide-react';

const steps = [
  { id: 1, title: 'Planning', icon: ClipboardList, description: 'Define scope and timeline' },
  { id: 2, title: 'Financing', icon: Euro, description: 'Secure funding and budget' },
  { id: 3, title: 'Approvals', icon: FileCheck, description: 'Get necessary permits' },
  { id: 4, title: 'Contracting', icon: Users, description: 'Hire professionals' },
  { id: 5, title: 'Implementation', icon: Wrench, description: 'Execute the work' },
  { id: 6, title: 'Reporting', icon: FileText, description: 'Document and finalize' },
];

export function WorkflowSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg">
            Six simple steps from concept to completion
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-200 via-blue-200 to-emerald-200 hidden md:block"></div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="group cursor-pointer"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                        <Icon className="w-10 h-10 text-emerald-600 group-hover:text-emerald-700" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shadow-lg">
                        {step.id}
                      </div>
                    </div>
                    <h3 className="mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
