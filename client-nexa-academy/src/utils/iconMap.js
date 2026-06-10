import {
  BookOpen,
  Clock,
  Target,
  Route,
  Code2,
  Briefcase,
  Users,
  Package,
  Rocket,
  Cloud,
  BarChart2,
  Wrench,
  ClipboardList,
  Shield,
  Globe,
  Star,
  Zap,
  Heart,
  Award,
  Layers,
} from "lucide-react";

/** Maps icon name strings (stored in DB) to Lucide components. */
export const iconMap = {
  BookOpen,
  Clock,
  Target,
  Route,
  Code2,
  Briefcase,
  Users,
  Package,
  Rocket,
  Cloud,
  BarChart2,
  Wrench,
  ClipboardList,
  Shield,
  Globe,
  Star,
  Zap,
  Heart,
  Award,
  Layers,
};

/** Returns the Lucide component for a given name, falling back to BookOpen. */
export function getIcon(name) {
  return iconMap[name] ?? BookOpen;
}
