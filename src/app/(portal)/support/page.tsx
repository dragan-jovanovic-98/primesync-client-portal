import { requirePortalSession } from "@/lib/portal/session";
import { submitSupportRequest } from "./actions";
import Link from "next/link";
import {
  CreditCard,
  Phone,
  Settings,
  Calendar,
  MessageSquare,
  Mail,
} from "lucide-react";
import { FaqAccordion } from "@/components/support/faq-accordion";
import { BRAND } from "@/lib/brand";

const QUICK_LINKS = [
  { label: "Billing dashboard", href: "/billing", icon: CreditCard },
  { label: "Locations & agents", href: "/settings/locations", icon: Phone },
  { label: "Business hours", href: "/settings/locations", icon: Calendar },
  { label: "Account settings", href: "/settings/account", icon: Settings },
];

const FAQ_ITEMS = [
  {
    question: "What is an AI Voice Agent and how does it work?",
    answer:
      "Your AI Voice Agent uses natural language processing to understand and respond to callers in real time. It handles inbound calls automatically — answering questions, scheduling appointments, taking messages, and routing urgent calls — all through natural conversation rather than rigid phone menus.",
  },
  {
    question: "How does billing work?",
    answer:
      "Billing is based on your subscription plan and call minute usage. Each billing cycle, your included minutes are tracked automatically. If you exceed your included minutes, overage is billed at your plan\u2019s per-minute rate. You can view your current usage, invoices, and payment methods from the Billing page.",
  },
  {
    question: "Can I change my agent\u2019s greeting or business hours?",
    answer:
      "Yes — go to Settings > Locations to edit your agent\u2019s intro message, business hours, and holiday closures. For deeper changes like prompt adjustments or capability changes, submit a support request from this page.",
  },
  {
    question: "How do I add team members to the portal?",
    answer:
      "Go to Settings > Team to invite new members by email. You can assign admin or staff roles. Admins can manage billing, users, and all settings. Staff members can view the dashboard, call logs, and operational areas but cannot access billing or user management.",
  },
  {
    question: "What integrations does TorQi support?",
    answer:
      "TorQi syncs with over 5,000 integrations including ServiceTitan, HubSpot, Google Calendar, Microsoft 365, Calendly, Jobber, Housecall Pro, and other industry-specific platforms. Your agent can book appointments directly into your calendar and sync with your existing CRM.",
  },
  {
    question: "What makes TorQi different from other AI phone solutions?",
    answer:
      "TorQi offers advanced conversational intelligence that goes beyond basic Q&A. Your agent learns and improves from every interaction, integrates seamlessly with your existing business software, and can be customized with voice personas that match your brand. Most clients are fully up and running within a few days.",
  },
];

const CATEGORIES = [
  "Agent changes",
  "Billing & payments",
  "Technical issue",
  "Account & access",
  "General question",
];

const statusMessages: Record<string, string> = {
  "support-submitted": "Your message has been sent. We\u2019ll get back to you within one business day.",
  "support-error": "We could not send your message. Please try again.",
  "support-invalid": "Please fill in all fields before submitting.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePortalSession({ page: "support" });
  const { status } = await searchParams;
  const feedback = status ? statusMessages[status] : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-lg font-semibold text-zinc-900">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Find answers to common questions or get in touch with our team.
        </p>
        {feedback ? (
          <p className="mt-3 text-[13px] text-emerald-600">{feedback}</p>
        ) : null}
      </div>

      {/* Quick links — Courtside pattern */}
      <div className="pb-8">
        <h2 className="text-sm font-medium text-zinc-900">Quick links</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-200 px-3 py-2.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* FAQ — Courtside accordion pattern */}
      <div className="py-8">
        <h2 className="text-sm font-medium text-zinc-900">
          Frequently asked questions
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Common questions about the platform.
        </p>

        <FaqAccordion items={FAQ_ITEMS} />
      </div>

      <div className="h-px bg-zinc-200" />

      {/* Contact form — Courtside pattern */}
      <div className="py-8">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Contact us</h2>
            <p className="mt-1 text-[13px] text-zinc-500">
              Can&apos;t find what you need? Send us a message and we&apos;ll
              get back to you within one business day.
            </p>
          </div>
        </div>

        <form action={submitSupportRequest} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="subject" className="text-[13px] text-zinc-500">Subject</label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="Brief description of your issue"
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-[13px] text-zinc-500">Category</label>
              <select
                id="category"
                name="category"
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="text-[13px] text-zinc-500">Message</label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              placeholder="Describe your issue or question in detail..."
              className="w-full rounded-lg border border-[#eeeff1] px-2.5 py-2 text-[14px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--torqi-orange-hover)]"
          >
            Send message
          </button>
        </form>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* Direct contact — Courtside pattern */}
      <div className="py-8">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3.5">
          <Mail className="h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-[13px] text-zinc-500">
              You can also reach us directly at
            </p>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              {BRAND.supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
