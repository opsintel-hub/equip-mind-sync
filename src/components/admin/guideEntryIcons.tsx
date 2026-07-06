import {
  Shield, ClipboardCheck, Warehouse, PackageOpen, Send, Users, Settings2,
  Package, FileText, BarChart3, MapPin, Calendar, Wrench, ArrowRightLeft,
  Eye, Settings, Info, HelpCircle, Star, Truck, Camera, Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const GUIDE_ICONS: Record<string, LucideIcon> = {
  Shield, ClipboardCheck, Warehouse, PackageOpen, Send, Users, Settings2,
  Package, FileText, BarChart3, MapPin, Calendar, Wrench, ArrowRightLeft,
  Eye, Settings, Info, HelpCircle, Star, Truck, Camera, Layers,
};

export const GUIDE_ICON_NAMES = Object.keys(GUIDE_ICONS);

export function GuideIcon({ name, className }: { name?: string | null; className?: string }) {
  const Cmp = (name && GUIDE_ICONS[name]) || Shield;
  return <Cmp className={className} />;
}

export const GUIDE_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Amber", value: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { label: "Red", value: "bg-red-500/10 text-red-600 border-red-200" },
  { label: "Purple", value: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { label: "Blue", value: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { label: "Green", value: "bg-green-500/10 text-green-600 border-green-200" },
  { label: "Orange", value: "bg-orange-500/10 text-orange-600 border-orange-200" },
  { label: "Lime", value: "bg-lime-500/10 text-lime-600 border-lime-200" },
  { label: "Cyan", value: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  { label: "Yellow", value: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  { label: "Indigo", value: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  { label: "Pink", value: "bg-pink-500/10 text-pink-600 border-pink-200" },
  { label: "Teal", value: "bg-teal-500/10 text-teal-600 border-teal-200" },
  { label: "Emerald", value: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { label: "Sky", value: "bg-sky-500/10 text-sky-600 border-sky-200" },
  { label: "Violet", value: "bg-violet-500/10 text-violet-600 border-violet-200" },
];
