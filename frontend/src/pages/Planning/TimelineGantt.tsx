import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card/Card";

interface Task {
  id: number;
  name: string;
  start: number;
  duration: number;
  color: string;
}
const dummy = [
    {
        "id": 1,
        "name": "Analysis & Planning",
        "start": 0,
        "duration": 18,
        "color": "bg-emerald-500"
    },
    {
        "id": 2,
        "name": "Detail Planning & Tendering",
        "start": 18,
        "duration": 28,
        "color": "bg-blue-500"
    },
    {
        "id": 3,
        "name": "Permitting & Financing",
        "start": 46,
        "duration": 42,
        "color": "bg-amber-500"
    },
    {
        "id": 4,
        "name": "Contractor Selection",
        "start": 88,
        "duration": 18,
        "color": "bg-purple-500"
    },
    {
        "id": 5,
        "name": "Implementation",
        "start": 106,
        "duration": 112,
        "color": "bg-rose-500"
    },
    {
        "id": 6,
        "name": "Acceptance & Handover",
        "start": 218,
        "duration": 11,
        "color": "bg-gray-500"
    }
]
interface TimelineGanttProps {
  tasks?: Task[];
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Assuming 6 months timeline, approximately 180 days (6 * 30)


export function TimelineGantt({ tasks = [] }: TimelineGanttProps) {
  const TOTAL_TIMELINE_DAYS = Math.max(
  ...tasks?.map(t => t.start + t.duration),
  180 // minimum baseline
);
const NUM_MONTHS = Math.ceil(TOTAL_TIMELINE_DAYS / 30);

const months = Array.from({ length: NUM_MONTHS }, (_, i) => 
  new Date(2025, i).toLocaleString("en-US", { month: "short" })
);
  if (tasks.length === 0) {
    return null; // Don't render if no tasks
  }
  console.log("Gantt tasks:", tasks);
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Timeline & Gantt Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline header */}
          <div className="flex items-center gap-2 pl-48">
            {months.map((month, idx) => (
              <div key={idx} className="flex-1 text-center text-sm text-gray-600">
                {month}
              </div>
            ))}
          </div>

          {/* Timeline grid */}
          <div className="relative">
            {/* Vertical grid lines */}
            <div className="absolute left-48 right-0 top-0 bottom-0 flex">
              {Array.from({ length: months.length }).map((_, i) => (
                <div key={i} className="flex-1 border-l border-gray-100"></div>
              ))}
            </div>

            {/* Task bars */}
            <div className="space-y-3 relative">
              {tasks?.map((task) => {
  const leftPercent = (task.start / TOTAL_TIMELINE_DAYS) * 100;
  const widthPercent = (task.duration / TOTAL_TIMELINE_DAYS) * 100;

  return (
    <div key={task.id} className="flex items-center gap-4 h-10">
      <div className="w-44 text-sm">{task.name}</div>
      <div className="flex-1 relative h-full">
        <div
          className={`absolute h-8 ${task.color} rounded flex items-center justify-center text-white text-xs shadow-sm`}
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
          }}
        >
          {task.duration}d
        </div>
      </div>
    </div>
  );
})}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
