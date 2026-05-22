import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Bagde/Badge';
import { Euro, TrendingUp } from 'lucide-react';

export function BudgetPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-emerald-600" />
          Budget Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Estimated Cost</span>
            <span>€38,000 - €55,300</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Your Budget</span>
            <span>€50,000</span>
          </div>
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm">Financing Readiness</span>
              <Badge className="bg-emerald-100 text-emerald-700">Good Match</Badge>
            </div>
          </div>
        </div>
        <Button variant="primary" className="w-full">
          <TrendingUp className="w-4 h-4 mr-2" />
          Check KfW Funding Eligibility
        </Button>
      </CardContent>
    </Card>
  );
}
