import { useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Ambulance,
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileHeart,
  HeartHandshake,
  HeartPulse,
  Home,
  Hospital,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Stethoscope,
  UserRound,
  UsersRound,
  Video,
  WalletCards,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { showToast } from "@/src/components/ui/toast";

type Provider = {
  id: number;
  doctor: string;
  specialty: string;
  hospital: string;
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  nextSlot: string;
  fee: string;
  waitTime: string;
  experience: string;
  consultModes: string[];
  tags: string[];
  problems: string[];
  image: string;
  bio: string;
  languages: string[];
  insurance: string[];
};

type Appointment = {
  id: number;
  doctor: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  mode: string;
  status: "Confirmed" | "Pending" | "Completed";
  reason: string;
};

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

type CareCategory = {
  name: string;
  detail: string;
  specialty: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const providers: Provider[] = [
  {
    id: 1,
    doctor: "Dr. Amina Bello",
    specialty: "General Physician",
    hospital: "CedarCare Medical Centre",
    location: "Wuse 2, Abuja",
    distance: "3.2 km",
    rating: 4.9,
    reviewCount: 284,
    nextSlot: "Today, 2:30 PM",
    fee: "NGN 12,000",
    waitTime: "8 min",
    experience: "11 years",
    consultModes: ["Hospital visit", "Video call"],
    tags: ["Fever", "Body pain", "Malaria", "Cold"],
    problems: ["fever", "malaria", "cold", "cough", "headache", "body pain", "infection"],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
    bio: "Primary care physician focused on fast diagnosis, treatment planning, and clear referrals when specialist care is needed.",
    languages: ["English", "Hausa"],
    insurance: ["Reliance HMO", "AXA Mansard", "Self pay"],
  },
  {
    id: 2,
    doctor: "Dr. Tunde Adeyemi",
    specialty: "Cardiologist",
    hospital: "Prime Heart Hospital",
    location: "Garki, Abuja",
    distance: "5.6 km",
    rating: 4.8,
    reviewCount: 191,
    nextSlot: "Tomorrow, 10:00 AM",
    fee: "NGN 25,000",
    waitTime: "18 min",
    experience: "15 years",
    consultModes: ["Hospital visit", "Follow-up chat"],
    tags: ["Chest pain", "Blood pressure", "Palpitations"],
    problems: ["chest pain", "heart", "blood pressure", "hypertension", "palpitation"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=900&q=80",
    bio: "Heart specialist for blood pressure management, chest pain review, ECG interpretation, and ongoing cardiac monitoring.",
    languages: ["English", "Yoruba"],
    insurance: ["AXA Mansard", "Leadway", "Self pay"],
  },
  {
    id: 3,
    doctor: "Dr. Miriam Okonkwo",
    specialty: "Obstetrician and Gynecologist",
    hospital: "Bloom Women and Children Hospital",
    location: "Jabi, Abuja",
    distance: "6.1 km",
    rating: 4.9,
    reviewCount: 327,
    nextSlot: "Today, 5:00 PM",
    fee: "NGN 18,000",
    waitTime: "12 min",
    experience: "13 years",
    consultModes: ["Hospital visit", "Video call"],
    tags: ["Pregnancy", "Women health", "Pelvic pain"],
    problems: ["pregnancy", "period", "pelvic", "women", "fertility", "cramps"],
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=80",
    bio: "Women's health doctor for antenatal care, pelvic symptoms, fertility concerns, and preventive checks.",
    languages: ["English", "Igbo"],
    insurance: ["Reliance HMO", "NHIA", "Self pay"],
  },
  {
    id: 4,
    doctor: "Dr. Chika Musa",
    specialty: "Dermatologist",
    hospital: "ClearSkin Clinic",
    location: "Maitama, Abuja",
    distance: "4.8 km",
    rating: 4.7,
    reviewCount: 146,
    nextSlot: "Tomorrow, 1:30 PM",
    fee: "NGN 16,500",
    waitTime: "10 min",
    experience: "9 years",
    consultModes: ["Video call", "Hospital visit"],
    tags: ["Rashes", "Acne", "Skin allergy"],
    problems: ["rash", "skin", "acne", "itch", "allergy", "eczema"],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80",
    bio: "Skin specialist for rashes, acne, allergies, infections, and treatment plans that fit daily routines.",
    languages: ["English"],
    insurance: ["Self pay", "AXA Mansard"],
  },
  {
    id: 5,
    doctor: "Dr. Ifeanyi Nwosu",
    specialty: "Orthopedic Surgeon",
    hospital: "Metro Bone and Joint Hospital",
    location: "Asokoro, Abuja",
    distance: "7.4 km",
    rating: 4.8,
    reviewCount: 213,
    nextSlot: "Friday, 9:00 AM",
    fee: "NGN 22,000",
    waitTime: "21 min",
    experience: "14 years",
    consultModes: ["Hospital visit"],
    tags: ["Back pain", "Fracture", "Joint pain"],
    problems: ["bone", "fracture", "joint", "back pain", "knee", "injury", "sprain"],
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80",
    bio: "Bone and joint doctor for injuries, chronic pain, mobility issues, and post-treatment follow-up.",
    languages: ["English", "Igbo"],
    insurance: ["Leadway", "Self pay"],
  },
];

const navItems: NavItem[] = [
  { label: "Home", path: "/healthcare", icon: Home },
  { label: "Find Care", path: "/healthcare/find-care", icon: Search },
  { label: "Appointments", path: "/healthcare/appointments", icon: CalendarClock },
  { label: "Profile", path: "/healthcare/profile", icon: UserRound },
];

const concerns = ["Fever", "Chest pain", "Pregnancy", "Skin rash", "Back pain", "High blood pressure"];

const careCategories: CareCategory[] = [
  { name: "Primary care", detail: "Fever, cough, malaria, pain", specialty: "General Physician", icon: Stethoscope, tone: "bg-teal-50 text-teal-700 border-teal-100" },
  { name: "Heart care", detail: "Chest pain, BP, palpitations", specialty: "Cardiologist", icon: HeartPulse, tone: "bg-rose-50 text-rose-700 border-rose-100" },
  { name: "Women health", detail: "Pregnancy, cycle, pelvic pain", specialty: "Obstetrician and Gynecologist", icon: FileHeart, tone: "bg-sky-50 text-sky-700 border-sky-100" },
  { name: "Bone and joint", detail: "Back, knee, fracture, sprain", specialty: "Orthopedic Surgeon", icon: Activity, tone: "bg-orange-50 text-orange-700 border-orange-100" },
];

const hospitalNetwork = [
  { name: "CedarCare Medical Centre", location: "Wuse 2", open: "Open now", beds: "18 beds", tone: "bg-teal-50 text-teal-700" },
  { name: "Prime Heart Hospital", location: "Garki", open: "Specialist desk", beds: "6 ICU beds", tone: "bg-rose-50 text-rose-700" },
  { name: "Bloom Women and Children", location: "Jabi", open: "Antenatal clinic", beds: "24 beds", tone: "bg-sky-50 text-sky-700" },
];

const careTimeline = [
  { title: "Describe symptoms", detail: "Tell CareBridge what is wrong", icon: MessageCircle },
  { title: "Match provider", detail: "Rank doctors by specialty and access", icon: Sparkles },
  { title: "Confirm appointment", detail: "Hospital desk accepts or proposes a time", icon: CalendarCheck },
];

const initialAppointments: Appointment[] = [
  {
    id: 101,
    doctor: "Dr. Amina Bello",
    specialty: "General Physician",
    hospital: "CedarCare Medical Centre",
    date: "Today",
    time: "2:30 PM",
    mode: "Video call",
    status: "Confirmed",
    reason: "Fever and body pain",
  },
  {
    id: 102,
    doctor: "Dr. Miriam Okonkwo",
    specialty: "Obstetrician and Gynecologist",
    hospital: "Bloom Women and Children Hospital",
    date: "May 8",
    time: "11:00 AM",
    mode: "Hospital visit",
    status: "Pending",
    reason: "Routine women's health check",
  },
];

function providerScore(provider: Provider, problem: string) {
  const normalized = problem.toLowerCase();
  if (!normalized.trim()) return provider.rating;
  const directMatch = provider.problems.some((item) => normalized.includes(item) || item.includes(normalized));
  const tagMatch = provider.tags.some((item) => normalized.includes(item.toLowerCase()));
  const specialtyMatch = provider.specialty.toLowerCase().includes(normalized);
  return provider.rating + (directMatch ? 3 : 0) + (tagMatch ? 1.2 : 0) + (specialtyMatch ? 1.4 : 0);
}

function getProvider(id?: string | number) {
  const numericId = Number(id);
  return providers.find((provider) => provider.id === numericId) ?? providers[0];
}

function PageHeader({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black tracking-normal text-neutral-950 sm:text-3xl">{title}</h1>
        {detail && <p className="mt-2 text-sm font-semibold leading-6 text-neutral-500">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const tone = {
    Confirmed: "bg-teal-50 text-teal-700 border-teal-200",
    Pending: "bg-orange-50 text-orange-700 border-orange-200",
    Completed: "bg-neutral-100 text-neutral-600 border-neutral-200",
  }[status];

  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function InfoPill({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-600">
      <Icon className="h-3.5 w-3.5 text-teal-600" />
      {children}
    </span>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3fbfa_0%,#fbf7f1_48%,#f8fafc_100%)] text-neutral-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-teal-100/80 bg-white/90 lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-teal-100 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black">CareBridge</p>
              <p className="text-xs font-bold text-neutral-500">Patient care app</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/healthcare"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition-all ${
                    isActive
                      ? "bg-teal-50 text-teal-700 shadow-sm"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-teal-100 p-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-sky-800">
                <ShieldCheck className="h-4 w-4" />
                Care confidence
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-sky-800/80">
                Verified providers, appointment tracking, and clear next steps after each request.
              </p>
            </div>
            <a href="tel:112" className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white shadow-sm shadow-rose-500/20">
              <Ambulance className="h-4 w-4" />
              Emergency help
            </a>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white lg:hidden">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-neutral-950">Good afternoon, Ada</p>
                  <p className="truncate text-xs font-bold text-neutral-500">Abuja, Nigeria - Care ID CB-2048</p>
                </div>
              </div>
              <div className="hidden min-w-0 max-w-md flex-1 md:block">
                <Link to="/healthcare/find-care" className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-bold text-neutral-500 hover:border-teal-200 hover:bg-white">
                  <Search className="h-4 w-4 text-teal-600" />
                  Search symptoms, doctors, hospitals
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/healthcare/book"
                  className="hidden h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-black text-white shadow-sm shadow-teal-600/20 hover:bg-teal-700 sm:flex"
                >
                  <CalendarClock className="h-4 w-4" />
                  Book
                </Link>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid h-16 grid-cols-4 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/healthcare"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black ${
                  isActive ? "bg-teal-50 text-teal-700" : "text-neutral-500"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function DashboardPage({
  problem,
  setProblem,
  setSpecialty,
  matches,
  appointments,
}: {
  problem: string;
  setProblem: (value: string) => void;
  setSpecialty: (value: string) => void;
  matches: Provider[];
  appointments: Appointment[];
}) {
  const nextAppointment = appointments[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.42fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
            <div className="p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-sm font-black text-teal-700">
                <Sparkles className="h-4 w-4" />
                Smart care matching
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal text-neutral-950 sm:text-5xl">
                Care that feels easier to find and easier to trust.
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-neutral-600">
                Describe what is wrong, compare verified doctors, and request the right consultation without bouncing between hospital desks.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-600" />
                  <Input
                    value={problem}
                    onChange={(event) => setProblem(event.target.value)}
                    placeholder="Chest pain, fever, pregnancy, skin rash..."
                    className="bg-neutral-50 pl-10"
                  />
                </div>
                <Button asChild className="shrink-0 bg-teal-600 hover:bg-teal-700">
                  <Link to="/healthcare/find-care">
                    Match me
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {concerns.map((concern) => (
                  <button
                    key={concern}
                    type="button"
                    onClick={() => setProblem(concern)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-black text-neutral-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                  >
                    {concern}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-72 bg-[linear-gradient(135deg,rgba(20,184,166,0.86),rgba(14,116,144,0.62)),url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center p-5 text-white">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black ring-1 ring-white/20">Live access</span>
                </div>
                <div className="rounded-xl bg-white/14 p-4 ring-1 ring-white/20 backdrop-blur">
                  <p className="text-sm font-bold text-teal-50">Best match right now</p>
                  <p className="mt-1 text-2xl font-black">{matches[0].doctor}</p>
                  <p className="mt-1 text-sm font-bold text-neutral-100">{matches[0].specialty} - {matches[0].nextSlot}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-[#f0fdfa] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-teal-700">Next appointment</p>
            <StatusBadge status={nextAppointment.status} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-neutral-950">{nextAppointment.doctor}</h2>
          <p className="mt-1 font-bold text-teal-700">{nextAppointment.specialty}</p>
          <div className="mt-5 space-y-3 text-sm font-semibold text-neutral-600">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-teal-600" />
              {nextAppointment.date}, {nextAppointment.time}
            </p>
            <p className="flex items-center gap-2">
              <Video className="h-4 w-4 text-teal-600" />
              {nextAppointment.mode}
            </p>
            <p className="flex items-center gap-2">
              <Hospital className="h-4 w-4 text-teal-600" />
              {nextAppointment.hospital}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild className="bg-teal-600 text-white hover:bg-teal-700">
              <Link to="/healthcare/appointments">Open</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/healthcare/book">Book new</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {careCategories.map((category) => (
          <Link
            key={category.name}
            to="/healthcare/find-care"
            onClick={() => {
              setProblem(category.detail);
              setSpecialty(category.specialty);
            }}
            className={`rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md ${category.tone}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70">
              <category.icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-black text-neutral-950">{category.name}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">{category.detail}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-teal-700">Recommended</p>
              <h2 className="text-xl font-black text-neutral-950">Doctors ready for booking</h2>
            </div>
            <Link to="/healthcare/find-care" className="flex items-center gap-1 text-sm font-black text-teal-700">
              See all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {matches.slice(0, 2).map((provider) => (
              <div key={provider.id}>
                <ProviderMiniCard provider={provider} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-teal-700">How it works</p>
          <h2 className="mt-1 text-xl font-black text-neutral-950">Simple care flow</h2>
          <div className="mt-4 space-y-3">
            {careTimeline.map((item, index) => (
              <div key={item.title} className="flex gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-neutral-900">{index + 1}. {item.title}</p>
                  <p className="mt-0.5 text-xs font-bold text-neutral-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase text-teal-700">Hospital network</p>
            <h2 className="text-xl font-black text-neutral-950">Nearby care partners</h2>
          </div>
          <Link to="/healthcare/find-care" className="text-sm font-black text-teal-700">Browse doctors</Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {hospitalNetwork.map((hospital) => (
            <div key={hospital.name} className="rounded-xl border border-neutral-200 bg-[#fbfefd] p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${hospital.tone}`}>
                <Hospital className="h-5 w-5" />
              </div>
              <p className="mt-4 font-black text-neutral-950">{hospital.name}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">{hospital.location}</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">{hospital.open}</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">{hospital.beds}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProviderMiniCard({ provider }: { provider: Provider }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-[#fbfefd] p-4">
      <div className="flex items-start gap-3">
        <img src={provider.image} alt={provider.doctor} className="h-16 w-16 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-neutral-950">{provider.doctor}</p>
          <p className="text-sm font-bold text-teal-700">{provider.specialty}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <InfoPill icon={Star}>{provider.rating}</InfoPill>
            <InfoPill icon={Clock3}>{provider.waitTime}</InfoPill>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700">
          <Link to={`/healthcare/book/${provider.id}`}>Book</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link to={`/healthcare/providers/${provider.id}`}>Details</Link>
        </Button>
      </div>
    </article>
  );
}

function FindCarePage({
  problem,
  setProblem,
  consultType,
  setConsultType,
  specialty,
  setSpecialty,
  matches,
}: {
  problem: string;
  setProblem: (value: string) => void;
  consultType: string;
  setConsultType: (value: string) => void;
  specialty: string;
  setSpecialty: (value: string) => void;
  matches: Provider[];
}) {
  const specialties = ["All", ...Array.from(new Set(providers.map((provider) => provider.specialty)))];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Find care"
        title="Match symptoms to the right provider"
        detail="Search by problem, choose a consultation type, then compare doctors by access, cost, distance, and hospital."
      >
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to="/healthcare/book">
            New booking
            <CalendarClock className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_330px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-600" />
            <Input
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              placeholder="Search symptoms, conditions, hospitals, or specialties"
              className="bg-neutral-50 pl-10"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Any", "Hospital visit", "Video call"].map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setConsultType(mode)}
                className={`rounded-xl border px-3 py-2 text-sm font-black ${
                  consultType === mode
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {mode === "Hospital visit" ? "Visit" : mode === "Video call" ? "Video" : "Any"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 mobile-scroll-row">
          {specialties.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSpecialty(item)}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black ${
                specialty === item ? "border-teal-600 bg-teal-50 text-teal-700" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {concerns.map((concern) => (
            <button
              key={concern}
              type="button"
              onClick={() => setProblem(concern)}
              className="rounded-full border border-neutral-200 px-3 py-2 text-sm font-black text-neutral-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              {concern}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_330px]">
        <div className="space-y-3">
          {matches.map((provider) => (
            <div key={provider.id}>
              <ProviderSearchCard provider={provider} />
            </div>
          ))}
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-neutral-950">Care filters</p>
                <p className="text-sm font-semibold text-neutral-500">{matches.length} matches found</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {["Open today", "Accepts HMO", "Within 10 km", "Video available"].map((filter) => (
                <label key={filter} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm font-black text-neutral-700">
                  <input type="checkbox" defaultChecked={filter !== "Accepts HMO"} />
                  {filter}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-rose-700">
              <Ambulance className="h-4 w-4" />
              Emergency note
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-rose-900">
              Severe chest pain, stroke signs, heavy bleeding, or breathing difficulty should go straight to emergency care.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ProviderSearchCard({ provider }: { provider: Provider }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[132px_1fr]">
        <img src={provider.image} alt={provider.doctor} className="h-36 w-full rounded-xl object-cover sm:h-full sm:w-32" />
        <div className="min-w-0">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-neutral-950">{provider.doctor}</h2>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">Verified</span>
              </div>
              <p className="font-bold text-teal-700">{provider.specialty}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-neutral-500">{provider.bio}</p>
            </div>
            <div className="flex w-fit items-center gap-1 rounded-xl bg-yellow-50 px-2.5 py-1.5 text-sm font-black text-yellow-800">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
              {provider.rating}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoPill icon={Building2}>{provider.hospital}</InfoPill>
            <InfoPill icon={Navigation}>{provider.distance}</InfoPill>
            <InfoPill icon={Clock3}>{provider.nextSlot}</InfoPill>
            <InfoPill icon={CreditCard}>{provider.fee}</InfoPill>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {provider.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/healthcare/providers/${provider.id}`}>Details</Link>
              </Button>
              <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Link to={`/healthcare/book/${provider.id}`}>Book</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProviderDetailPage() {
  const { id } = useParams();
  const provider = getProvider(id);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader eyebrow="Provider" title={provider.doctor} detail={provider.bio}>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to={`/healthcare/book/${provider.id}`}>
            Book visit
            <CalendarClock className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
          <img src={provider.image} alt={provider.doctor} className="h-80 w-full object-cover lg:h-full" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-700">{provider.specialty}</span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-black text-yellow-800">{provider.rating} rating</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">{provider.reviewCount} reviews</span>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-orange-700">{provider.experience}</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { label: "Hospital", value: provider.hospital, icon: Hospital },
                { label: "Location", value: `${provider.location} - ${provider.distance}`, icon: MapPin },
                { label: "Next slot", value: provider.nextSlot, icon: Clock3 },
                { label: "Languages", value: provider.languages.join(", "), icon: MessageCircle },
                { label: "Consultation fee", value: provider.fee, icon: CreditCard },
                { label: "Average wait", value: provider.waitTime, icon: Activity },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-neutral-200 bg-[#fbfefd] p-4">
                  <item.icon className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-xs font-black uppercase text-neutral-500">{item.label}</p>
                  <p className="mt-1 font-black text-neutral-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 p-4">
              <p className="font-black text-teal-900">Accepted payment</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {provider.insurance.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-teal-600 hover:bg-teal-700">
                <Link to={`/healthcare/book/${provider.id}`}>Request appointment</Link>
              </Button>
              <Button type="button" variant="outline">
                <Phone className="h-4 w-4" />
                Call hospital
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BookingPage({ onCreate }: { onCreate: (appointment: Appointment) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState(String(getProvider(id).id));
  const [mode, setMode] = useState(getProvider(id).consultModes[0]);
  const [date, setDate] = useState("Today");
  const [time, setTime] = useState("2:30 PM");
  const [reason, setReason] = useState("");
  const provider = getProvider(providerId);
  const slots = ["9:00 AM", "10:00 AM", "11:30 AM", "2:30 PM", "5:00 PM"];

  const submitBooking = (event: FormEvent) => {
    event.preventDefault();
    onCreate({
      id: Date.now(),
      doctor: provider.doctor,
      specialty: provider.specialty,
      hospital: provider.hospital,
      date,
      time,
      mode,
      status: "Pending",
      reason: reason || "Consultation request",
    });
    showToast("Appointment request sent.");
    navigate("/healthcare/appointments");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader eyebrow="Booking" title="Request an appointment" detail="Choose a provider, consultation mode, and preferred time. The hospital desk can confirm or suggest a nearby slot." />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submitBooking} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 grid grid-cols-3 gap-2">
            {["Provider", "Schedule", "Patient"].map((step, index) => (
              <div key={step} className="rounded-xl border border-teal-100 bg-teal-50 p-3">
                <p className="text-xs font-black text-teal-700">Step {index + 1}</p>
                <p className="mt-1 text-sm font-black text-neutral-950">{step}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-neutral-700">Doctor or hospital</span>
              <select
                value={providerId}
                onChange={(event) => {
                  const next = getProvider(event.target.value);
                  setProviderId(event.target.value);
                  setMode(next.consultModes[0]);
                }}
                className="w-full"
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.doctor} - {item.specialty} - {item.hospital}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-neutral-700">Consultation mode</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {provider.consultModes.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-xl border px-3 py-3 text-sm font-black ${
                      mode === item ? "border-teal-600 bg-teal-600 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-black text-neutral-700">Preferred date</span>
              <select value={date} onChange={(event) => setDate(event.target.value)} className="w-full">
                {["Today", "Tomorrow", "May 8", "May 9", "May 10"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-black text-neutral-700">Preferred time</span>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setTime(item)}
                    className={`rounded-xl border px-3 py-2 text-sm font-black ${
                      time === item ? "border-teal-600 bg-teal-50 text-teal-700" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-black text-neutral-700">Patient full name</span>
              <Input required placeholder="Ada Musa" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-black text-neutral-700">Phone number</span>
              <Input required placeholder="+234..." />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-neutral-700">Health concern</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Symptoms, duration, current medication, and urgency"
                className="min-h-32 w-full"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
              Send request
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline">
              <Link to="/healthcare/find-care">Choose another doctor</Link>
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border border-orange-100 bg-[#fff7ed] p-5 text-neutral-950 shadow-sm">
          <img src={provider.image} alt={provider.doctor} className="h-48 w-full rounded-xl object-cover" />
          <p className="mt-4 text-sm font-black text-teal-700">Selected provider</p>
          <h2 className="mt-1 text-2xl font-black">{provider.doctor}</h2>
          <p className="font-bold text-teal-700">{provider.specialty}</p>
          <div className="mt-4 space-y-3 text-sm font-semibold text-neutral-600">
            <p className="flex items-center gap-2">
              <Hospital className="h-4 w-4 text-teal-600" />
              {provider.hospital}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              {provider.location}
            </p>
            <p className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-teal-600" />
              {provider.fee}
            </p>
          </div>
          <div className="mt-5 rounded-xl bg-white/70 p-4">
            <p className="text-sm font-black text-neutral-950">Request summary</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600">
              {mode} on {date} at {time}. The hospital desk will confirm availability before the appointment becomes final.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AppointmentsPage({ appointments }: { appointments: Appointment[] }) {
  const stats = [
    { label: "Upcoming", value: appointments.filter((item) => item.status !== "Completed").length, icon: CalendarClock },
    { label: "Pending", value: appointments.filter((item) => item.status === "Pending").length, icon: Clock3 },
    { label: "Completed", value: appointments.filter((item) => item.status === "Completed").length, icon: Check },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader eyebrow="Appointments" title="Manage consultations" detail="Track upcoming visits, pending requests, video calls, and hospital appointments.">
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to="/healthcare/book">
            Book
            <CalendarClock className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <item.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-black text-neutral-950">{item.value}</p>
            <p className="text-sm font-bold text-neutral-500">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {appointments.map((appointment) => (
          <article key={appointment.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-neutral-950">{appointment.doctor}</h2>
                  <StatusBadge status={appointment.status} />
                </div>
                <p className="mt-1 font-bold text-teal-700">{appointment.specialty}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-500">{appointment.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="bg-teal-600 hover:bg-teal-700">
                  <Video className="h-4 w-4" />
                  Join
                </Button>
                <Button type="button" size="sm" variant="outline">
                  Reschedule
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill icon={CalendarClock}>{appointment.date}, {appointment.time}</InfoPill>
              <InfoPill icon={Hospital}>{appointment.hospital}</InfoPill>
              <InfoPill icon={MessageCircle}>{appointment.mode}</InfoPill>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader eyebrow="Profile" title="Patient record and preferences" detail="Keep patient details, coverage, medications, and emergency contacts ready for faster appointments.">
        <Button type="button" variant="outline">
          <Settings className="h-4 w-4" />
          Edit
        </Button>
      </PageHeader>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <UserRound className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-neutral-950">Ada Musa</h2>
              <p className="font-bold text-neutral-500">Care ID CB-2048</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm font-semibold text-neutral-600">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-teal-600" />
              +234 800 000 0000
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-teal-600" />
              ada.musa@example.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              Abuja, Nigeria
            </p>
            <p className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-teal-600" />
              HMO plan active
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { title: "Medical notes", value: "No known allergies recorded", icon: FileHeart, tone: "bg-teal-50 text-teal-700" },
            { title: "Medication", value: "Paracetamol, vitamin D", icon: Pill, tone: "bg-orange-50 text-orange-700" },
            { title: "Dependents", value: "Mother, spouse, child", icon: UsersRound, tone: "bg-sky-50 text-sky-700" },
            { title: "Documents", value: "3 lab results uploaded", icon: ShieldCheck, tone: "bg-rose-50 text-rose-700" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-black text-neutral-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Blood type", value: "O+", icon: HeartPulse },
          { label: "Emergency contact", value: "Musa Bello", icon: Phone },
          { label: "Preferred hospital", value: "CedarCare", icon: Hospital },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <item.icon className="h-5 w-5 text-teal-700" />
            <p className="mt-3 text-xs font-black uppercase text-neutral-500">{item.label}</p>
            <p className="mt-1 text-lg font-black text-neutral-950">{item.value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function HealthcareApp() {
  const [problem, setProblem] = useState("");
  const [consultType, setConsultType] = useState("Any");
  const [specialty, setSpecialty] = useState("All");
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  const matches = useMemo(() => {
    return [...providers]
      .filter((provider) => consultType === "Any" || provider.consultModes.includes(consultType))
      .filter((provider) => specialty === "All" || provider.specialty === specialty)
      .sort((a, b) => providerScore(b, problem) - providerScore(a, problem));
  }, [problem, consultType, specialty]);

  return (
    <AppShell>
      <Routes>
        <Route
          index
          element={
            <DashboardPage
              problem={problem}
              setProblem={setProblem}
              setSpecialty={setSpecialty}
              matches={matches}
              appointments={appointments}
            />
          }
        />
        <Route
          path="find-care"
          element={
            <FindCarePage
              problem={problem}
              setProblem={setProblem}
              consultType={consultType}
              setConsultType={setConsultType}
              specialty={specialty}
              setSpecialty={setSpecialty}
              matches={matches}
            />
          }
        />
        <Route path="providers/:id" element={<ProviderDetailPage />} />
        <Route path="book" element={<BookingPage onCreate={(appointment) => setAppointments((items) => [appointment, ...items])} />} />
        <Route path="book/:id" element={<BookingPage onCreate={(appointment) => setAppointments((items) => [appointment, ...items])} />} />
        <Route path="appointments" element={<AppointmentsPage appointments={appointments} />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/healthcare" replace />} />
      </Routes>
    </AppShell>
  );
}
