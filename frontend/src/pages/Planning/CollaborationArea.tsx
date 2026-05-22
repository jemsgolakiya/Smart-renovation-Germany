import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card/Card';
import { Avatar, AvatarFallback } from '../../components/Avatar/Avatar';
import { MessageCircle } from 'lucide-react';

interface Stakeholder {
  name: string;
  role: string;
  when_needed?: string;
  estimated_cost?: string;
  how_to_find?: string;
}

interface CollaborationAreaProps {
  stakeholders?: Stakeholder[];
}

// Generate initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Color mapping for consistent colors
const colorClasses = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

export function CollaborationArea({ stakeholders = [] }: CollaborationAreaProps) {
  if (stakeholders.length === 0) {
    return null; // Don't render if no stakeholders
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Stakeholders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stakeholders.map((stakeholder, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className={colorClasses[index % colorClasses.length]}>
                  {getInitials(stakeholder.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{stakeholder.name}</div>
                <div className="text-xs text-gray-600">{stakeholder.role}</div>
                {stakeholder.when_needed && (
                  <div className="text-xs text-gray-500 mt-1">
                    Needed: {stakeholder.when_needed}
                  </div>
                )}
              </div>
            </div>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}