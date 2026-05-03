import { useEffect, useMemo, useState } from "react";
import { Search, Shirt, UserRound, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type GlobalSearchResults } from "@/src/lib/api";

const emptyResults: GlobalSearchResults = { students: [], staff: [], baskets: [], meals: [] };

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(emptyResults);
  const resultCount = useMemo(
    () => results.students.length + results.staff.length + results.baskets.length + results.meals.length,
    [results]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults(emptyResults);
      return;
    }
    const timeout = window.setTimeout(() => {
      api.globalSearch(query).then(setResults).catch(() => setResults(emptyResults));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [isOpen, query]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)} className="hidden md:flex w-full justify-start text-neutral-500">
        <Search className="w-4 h-4" />
        Search everything
        <span className="ml-auto text-xs text-neutral-400">Ctrl K</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-start justify-center pt-16">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-neutral-100 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-neutral-400" />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find students, baskets, meals, staff..." className="border-0 focus-visible:ring-0 text-base" />
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4 space-y-5">
              {query.trim().length < 2 ? (
                <p className="text-sm text-neutral-500 text-center py-10">Type at least 2 characters to search.</p>
              ) : resultCount === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-10">No matching records found.</p>
              ) : (
                <>
                  <ResultGroup title="Students" icon={UserRound} items={results.students.map((student) => `${student.name} - ${student.studentId} - ${student.hostel}`)} />
                  <ResultGroup title="Staff" icon={UserRound} items={results.staff.map((staff) => `${staff.name} - ${staff.role} - ${staff.email}`)} />
                  <ResultGroup title="Laundry Baskets" icon={Shirt} items={results.baskets.map((basket) => `#${basket.basketCode} - ${basket.studentId} - ${basket.status}`)} />
                  <ResultGroup title="Meals" icon={UtensilsCrossed} items={results.meals.map((meal) => `${meal.type} - ${meal.status} - ${meal.menu}`)} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ title, icon: Icon, items }: { title: string; icon: typeof Search; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 flex items-center gap-3">
            <Icon className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-medium text-neutral-800">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
