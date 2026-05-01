import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { UtensilsCrossed, Shirt, Clock } from "lucide-react";
import { api, type StudentOverview } from "@/src/lib/api";

export default function Dashboard() {
  const [overview, setOverview] = useState<StudentOverview | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    api.studentOverview(studentId).then(setOverview).catch(console.error);
  }, []);

  const meals = overview?.meals ?? [];
  const remainingMeals = meals.filter((meal) => !meal.consumed).length;
  const currentLaundry = overview?.laundry[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Student Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meals Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
              <UtensilsCrossed className="w-5 h-5 mr-2 text-indigo-600" />
              Today's Meals
            </h2>
            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {remainingMeals} Remaining
            </span>
          </div>
          
          <div className="space-y-4">
            {meals.map((meal) => (
              <div key={meal.id} className={`flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100 ${meal.consumed ? "opacity-50" : ""}`}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${meal.consumed ? "bg-neutral-200" : "bg-neutral-100"}`}>
                    <UtensilsCrossed className={`w-5 h-5 ${meal.consumed ? "text-neutral-500" : "text-neutral-400"}`} />
                  </div>
                  <div>
                    <p className={`font-medium text-neutral-900 ${meal.consumed ? "line-through" : ""}`}>{meal.type}</p>
                    <p className="text-sm text-neutral-500">{meal.startTime} - {meal.endTime}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{meal.consumed ? "Consumed" : "Pending"}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Laundry Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
              <Shirt className="w-5 h-5 mr-2 text-indigo-600" />
              Laundry Status
            </h2>
          </div>
          
          <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Shirt className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">{currentLaundry?.notes || currentLaundry?.status || "No active basket"}</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {currentLaundry ? `Your basket #${currentLaundry.basketCode} is currently ${currentLaundry.status.toLowerCase()}.` : "No laundry basket is currently active."}
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-sm font-medium text-indigo-700">
              <Clock className="w-4 h-4" />
              <span>Estimated finish: {currentLaundry?.estimatedFinish || "Not scheduled"}</span>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-neutral-900 mb-3">Recent Activity</h4>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mr-3"></div>
                <span className="text-neutral-600 flex-1">Basket dropped off</span>
                <span className="text-neutral-400">{currentLaundry?.receivedAt || "No activity"}</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-3"></div>
                <span className="text-neutral-600 flex-1">Basket picked up</span>
                <span className="text-neutral-400">Mon, 2:30 PM</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
