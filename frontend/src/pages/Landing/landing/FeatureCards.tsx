import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  ClipboardList,
  Euro,
  HardHat,
  FileText,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    id: 1,
    title: "Plan Your Work",
    description:
      "Generate renovation timelines, cost estimates, and permit checklists.",
    icon: ClipboardList,
    color: "emerald",
  },
  {
    id: 2,
    title: "Financing Guide",
    description: "Compare KfW loans, bank mortgages, and subsidy programs.",
    icon: Euro,
    color: "blue",
  },
  {
    id: 3,
    title: "Contractors",
    description: "Find and compare trusted service providers.",
    icon: HardHat,
    color: "purple",
  },
  {
    id: 4,
    title: "Documentation & Reports",
    description: "Store invoices, approvals, and AI-generated reports.",
    icon: FileText,
    color: "amber",
  },
];

export function FeatureCards() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="mb-4">Everything You Need in One Place</h2>
          <p className="text-gray-600 text-lg">
            Comprehensive tools to manage your renovation from start to finish
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-emerald-200"
              >
                <CardHeader>
                  <div
                    className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {feature.title}
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-base mb-4">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
