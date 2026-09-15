import {
  Coins, Users, Zap, BadgeCheck, Clock, LayoutGrid, BarChart3, TrendingUp,
  Headphones, UserPlus, ShieldCheck, Leaf,
  AppWindow, Database, Workflow, Sparkles, Cloud, Megaphone, Handshake, IdCard,
  Calculator, Cpu, Bot, Lightbulb, Code, Package,
  type LucideProps, type LucideIcon,
} from "lucide-react";

/* 課題・製品カテゴリの slug → アイコン。カバー・図・グリッドで使う。 */
const CH: Record<string, LucideIcon> = {
  cost: Coins, labor: Users, efficiency: Zap, quality: BadgeCheck,
  leadtime: Clock, standardize: LayoutGrid, data: BarChart3, sales: TrendingUp,
  cs: Headphones, hr: UserPlus, security: ShieldCheck, sustainability: Leaf,
};

const PR: Record<string, LucideIcon> = {
  saas: AppWindow, "core-system": Database, rpa: Workflow, ai: Sparkles,
  cloud: Cloud, security: ShieldCheck, martech: Megaphone, crm: Handshake,
  hrtech: IdCard, accounting: Calculator, iot: Cpu, robot: Bot,
  consulting: Lightbulb, dev: Code, "other-product": Package,
};

export function ChallengeIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = CH[slug] ?? Zap;
  return <Icon {...props} />;
}

export function ProductIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = PR[slug] ?? Package;
  return <Icon {...props} />;
}
