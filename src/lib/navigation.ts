import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Tags,
  Target,
  Repeat,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: (tenantSlug: string) => string;
  icon: LucideIcon;
  mobile?: boolean;
  children?: NavigationItem[];
};

const settingsChildren: NavigationItem[] = [
  {
    label: "Geral",
    href: (slug) => `/t/${slug}/settings/general`,
    icon: SlidersHorizontal,
  },
  {
    label: "Categorias",
    href: (slug) => `/t/${slug}/settings/categories`,
    icon: Tags,
  },
  {
    label: "Responsáveis",
    href: (slug) => `/t/${slug}/settings/people`,
    icon: Users,
  },
  {
    label: "Centros de custo",
    href: (slug) => `/t/${slug}/settings/cost-centers`,
    icon: Tags,
  },
  {
    label: "Membros e convites",
    href: (slug) => `/t/${slug}/settings/members`,
    icon: Users,
  },
];

export const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: (slug) => `/t/${slug}/dashboard`,
    icon: LayoutDashboard,
    mobile: true,
  },
  {
    label: "Transações",
    href: (slug) => `/t/${slug}/transactions`,
    icon: ArrowLeftRight,
    mobile: true,
  },
  {
    label: "Contas",
    href: (slug) => `/t/${slug}/accounts`,
    icon: Wallet,
    mobile: true,
  },
  {
    label: "Transferências",
    href: (slug) => `/t/${slug}/transfers`,
    icon: ArrowLeftRight,
  },
  {
    label: "Cartões",
    href: (slug) => `/t/${slug}/cards`,
    icon: CreditCard,
    mobile: true,
  },
  {
    label: "Planejamento",
    href: (slug) => `/t/${slug}/planning`,
    icon: CalendarDays,
  },
  {
    label: "Orçamentos",
    href: (slug) => `/t/${slug}/budgets`,
    icon: SlidersHorizontal,
  },
  {
    label: "Recorrências",
    href: (slug) => `/t/${slug}/recurrences`,
    icon: Repeat,
  },
  { label: "Metas", href: (slug) => `/t/${slug}/goals`, icon: Target },
  {
    label: "Relatórios",
    href: (slug) => `/t/${slug}/reports`,
    icon: BarChart3,
  },
  {
    label: "Configurações",
    href: (slug) => `/t/${slug}/settings/general`,
    icon: Settings,
    children: settingsChildren,
  },
];

export const mobileMoreItems = navigationItems.filter((item) => !item.mobile);
