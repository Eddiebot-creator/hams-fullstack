import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type Meal } from "@/src/lib/api";

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    api.meals().then(setMeals).catch(console.error);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Meals</h1>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Meal
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Meal Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time Window</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Menu Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {meals.map((meal, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{meal.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{meal.startTime} - {meal.endTime}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500 truncate max-w-xs">{meal.menu}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      meal.status === 'Active' ? 'bg-green-100 text-green-800' :
                      meal.status === 'Upcoming' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {meal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
