import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Shirt, UserRound, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type GlobalSearchResults } from "@/src/lib/api";

const emptyResults: GlobalSearchResults = { students: [], staff: [], baskets: [], meals: [] };

export default function GlobalSearch() {
  const navigate = useNavigate();
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

  const closeAndGo = (path: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)} className="hidden md:flex w-full justify-start text-neutral-500">
        <Search className="w-4 h-4" />
        Search everything
        <span className="ml-auto text-xs text-neutral-400">Ctrl K</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-neutral-100 p-4">
              <Search className="w-5 h-5 text-neutral-400" />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find students, baskets, meals, staff..." className="border-0 focus-visible:ring-0 text-base" />
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4 space-y-5">
              {query.trim().length < 2 ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm font-semibold text-neutral-500">Quick launcher</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <QuickSearchAction label="Admin dashboard" onClick={() => closeAndGo("/admin")} />
                    <QuickSearchAction label="Add students" onClick={() => closeAndGo("/admin/students")} />
                    <QuickSearchAction label="Kitchen scanner" onClick={() => closeAndGo("/kitchen/scanner")} />
                    <QuickSearchAction label="Laundry board" onClick={() => closeAndGo("/laundry-staff/board")} />
                  </div>
                  <p className="pt-4 text-center text-sm text-neutral-500">Type at least 2 characters to search records.</p>
                </div>
              ) : resultCount === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-10">No matching records found.</p>
              ) : (
                <>
                  <ResultGroup
                    title="Students"
                    icon={UserRound}
                    items={results.students.map((student) => ({
                      label: `${student.name} - ${student.studentId}`,
                      detail: `${student.hostel}${student.room ? `, room ${student.room}` : ""} - ${student.status}`,
                      onClick: () => closeAndGo(`/admin/users/${student.id}`),
                    }))}
                  />
                  <ResultGroup
                    title="Staff"
                    icon={UserRound}
                    items={results.staff.map((staff) => ({
                      label: `${staff.name} - ${staff.role}`,
                      detail: `${staff.email} - ${staff.status}`,
                      onClick: () => closeAndGo(`/admin/users/${staff.id}`),
                    }))}
                  />
                  <ResultGroup
                    title="Laundry Baskets"
                    icon={Shirt}
                    items={results.baskets.map((basket) => ({
                      label: `#${basket.basketCode} - ${basket.status}`,
                      detail: `${basket.studentId} - ${basket.receivedAt}`,
                      onClick: () => closeAndGo("/laundry-staff/board"),
                    }))}
                  />
                  <ResultGroup
                    title="Meals"
                    icon={UtensilsCrossed}
                    items={results.meals.map((meal) => ({
                      label: `${meal.type} - ${meal.status}`,
                      detail: meal.menu,
                      onClick: () => closeAndGo("/admin/meals"),
                    }))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickSearchAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-bold text-neutral-800 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
    >
      <Search className="h-4 w-4 text-indigo-600" />
      {label}
    </button>
  );
}

function ResultGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Search;
  items: Array<{ label: string; detail: string; onClick: () => void }>;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <button key={`${item.label}:${item.detail}`} type="button" onClick={item.onClick} className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md">
            <Icon className="w-4 h-4 text-indigo-600" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-neutral-800">{item.label}</span>
              <span className="block truncate text-xs font-medium text-neutral-500">{item.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
