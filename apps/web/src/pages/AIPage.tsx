import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AI } from "@/api/endpoints";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import type { AIResponse } from "@/types";

type ActionType = "createTask" | "sendEmail" | "updateOpp" | "triggerWorkflow";

interface ActionCardData {
  id: string;
  type: ActionType;
  title: string;
  body: string;
  references: { kind: "account" | "opportunity" | "project" | "workflow"; label: string; id: string | number }[];
  status: "draft" | "confirmed" | "cancelled";
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  text: string;
  bullets?: string[];
  confidence?: number;
  actions?: ActionCardData[];
  references?: ActionCardData["references"];
}

interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

type Message = AssistantMessage | UserMessage;

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ----------------------------------------------------------------------
// AI logic — wraps the existing /api/ai/* endpoints into a chat flow
// ----------------------------------------------------------------------

interface AIRoute {
  match: (q: string) => boolean;
  call: (q: string) => Promise<AIResponse>;
  enrich: (resp: AIResponse) => { actions?: ActionCardData[]; references?: ActionCardData["references"] };
}

function buildRoutes(): AIRoute[] {
  return [
    {
      match: (q) => /risk|at[- ]risk|風險|リスク/i.test(q),
      call: () => AI.riskExplanation(1),
      enrich: (resp) => ({
        actions: [
          {
            id: uid(),
            type: "createTask",
            title: resp.suggested_tasks[0] ?? "Schedule risk review",
            body: resp.suggested_tasks.slice(0, 2).join(" · "),
            references: [
              { kind: "project", label: "Fabrikam Onboarding", id: 1 },
            ],
            status: "draft",
          },
        ],
        references: [
          { kind: "account", label: "Fabrikam Retail", id: 2 },
          { kind: "project", label: "Fabrikam Onboarding", id: 1 },
        ],
      }),
    },
    {
      match: (q) => /weekly|週報|status update|週次/i.test(q),
      call: () => AI.customerSummary(1),
      enrich: (resp) => ({
        actions: [
          {
            id: uid(),
            type: "sendEmail",
            title: "Send weekly status",
            body: resp.summary,
            references: [{ kind: "account", label: "Contoso Manufacturing", id: 1 }],
            status: "draft",
          },
        ],
        references: [{ kind: "account", label: "Contoso Manufacturing", id: 1 }],
      }),
    },
    {
      match: (q) => /workflow|automation|失敗|fail|失敗/i.test(q),
      call: () => AI.riskExplanation(1),
      enrich: () => ({
        actions: [
          {
            id: uid(),
            type: "triggerWorkflow",
            title: "Re-run failed workflow",
            body: "Re-trigger the latest failed workflow run with the same payload.",
            references: [{ kind: "workflow", label: "Won opportunity → Onboarding", id: 1 }],
            status: "draft",
          },
        ],
        references: [{ kind: "workflow", label: "Won opportunity → Onboarding", id: 1 }],
      }),
    },
    {
      match: (q) => /next|next-best|action|下一步|next step|アクション/i.test(q),
      call: () => AI.nextBestAction(1),
      enrich: (resp) => ({
        actions: resp.suggested_tasks.slice(0, 2).map((task) => ({
          id: uid(),
          type: "createTask" as const,
          title: task,
          body: resp.summary,
          references: [{ kind: "account" as const, label: "Contoso Manufacturing", id: 1 }],
          status: "draft" as const,
        })),
        references: [{ kind: "account", label: "Contoso Manufacturing", id: 1 }],
      }),
    },
    {
      match: () => true,
      call: () => AI.customerSummary(1),
      enrich: () => ({
        references: [{ kind: "account", label: "Contoso Manufacturing", id: 1 }],
      }),
    },
  ];
}

const ROUTES = buildRoutes();

// ----------------------------------------------------------------------
export function AIPage() {
  const { t, i18n } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    { id: uid(), title: "", messages: [], createdAt: Date.now() },
  ]);
  const [activeConvId, setActiveConvId] = useState<string>(() => conversations[0].id);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId)!;

  const sendQuery = useMutation({
    mutationFn: async (query: string) => {
      const route = ROUTES.find((r) => r.match(query)) ?? ROUTES[ROUTES.length - 1];
      const resp = await route.call(query);
      const enriched = route.enrich(resp);
      return { resp, ...enriched };
    },
    onSuccess: ({ resp, actions, references }) => {
      const msg: AssistantMessage = {
        id: uid(),
        role: "assistant",
        text: resp.title ? `${resp.title} — ${resp.summary}` : resp.summary,
        bullets: resp.bullet_points,
        confidence: resp.confidence,
        actions,
        references,
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, messages: [...c.messages, msg] } : c)),
      );
    },
  });

  // auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [activeConv.messages.length, sendQuery.isPending]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: UserMessage = { id: uid(), role: "user", text: trimmed };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              title: c.title || trimmed.slice(0, 30),
              messages: [...c.messages, userMsg],
            }
          : c,
      ),
    );
    setInput("");
    sendQuery.mutate(trimmed);
  };

  const updateAction = (msgId: string, actionId: string, status: ActionCardData["status"]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId && m.role === "assistant"
                  ? {
                      ...m,
                      actions: m.actions?.map((a) => (a.id === actionId ? { ...a, status } : a)),
                    }
                  : m,
              ),
            }
          : c,
      ),
    );
  };

  const startNewChat = () => {
    const id = uid();
    setConversations((prev) => [{ id, title: "", messages: [], createdAt: Date.now() }, ...prev]);
    setActiveConvId(id);
  };

  // sample history (purely visual, populates sidebar even when empty)
  const sampleTitles = [
    t("ai.historySidebar.sample1"),
    t("ai.historySidebar.sample2"),
    t("ai.historySidebar.sample3"),
    t("ai.historySidebar.sample4"),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ai.title")}
        subtitle={t("ai.subtitle")}
        info={t("ai.info")}
      />

      <Card className="overflow-hidden">
        <div className="flex" style={{ minHeight: "640px" }}>
          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-60 shrink-0 border-r border-ms-line bg-white/[0.02] flex flex-col">
              <div className="p-3 border-b border-ms-line/60 flex items-center justify-between gap-2">
                <Button variant="primary" className="flex-1" onClick={startNewChat}>
                  + {t("ai.chat.newChat")}
                </Button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title={t("ai.historySidebar.collapse")}
                  className="h-8 w-8 rounded-md text-ms-muted hover:text-white hover:bg-white/5 flex items-center justify-center"
                >
                  ◀
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-soft">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-ms-muted">
                  {t("ai.historySidebar.title")}
                </div>
                <ul className="px-2 space-y-0.5">
                  {/* live conversations */}
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveConvId(c.id)}
                        className={`w-full text-left px-3 py-2 rounded text-xs truncate transition-colors ${
                          c.id === activeConvId
                            ? "bg-ms-blue/15 text-white border-l-2 border-ms-blue"
                            : "text-ms-muted hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {c.title || t("ai.chat.newChat")}
                      </button>
                    </li>
                  ))}
                  {/* sample preset entries (ghost) */}
                  {sampleTitles.map((title) => (
                    <li key={title}>
                      <div className="px-3 py-2 rounded text-xs text-ms-muted/60 truncate cursor-default">
                        {title}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="border-r border-ms-line bg-white/[0.02] flex items-start py-3 px-1">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title={t("ai.historySidebar.expand")}
                className="h-8 w-8 rounded-md text-ms-muted hover:text-white hover:bg-white/5 flex items-center justify-center"
              >
                ▶
              </button>
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-soft px-6 py-6">
              {activeConv.messages.length === 0 ? (
                <Welcome onPick={(q) => submit(q)} />
              ) : (
                <div className="space-y-4">
                  {activeConv.messages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} text={m.text} />
                    ) : (
                      <AssistantBubble
                        key={m.id}
                        msg={m}
                        onActionUpdate={(actionId, status) => updateAction(m.id, actionId, status)}
                      />
                    ),
                  )}
                  {sendQuery.isPending && <ThinkingBubble />}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-ms-line p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("ai.chat.placeholder")}
                  className="flex-1 bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
                />
                <Button variant="primary" type="submit" disabled={sendQuery.isPending || !input.trim()}>
                  {t("ai.chat.send")}
                </Button>
              </form>
              <div className="mt-2 text-[10px] text-ms-muted">
                {t("ai.actionCard.mockNotice")} · {i18n.language}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
function Welcome({ onPick }: { onPick: (q: string) => void }) {
  const { t } = useTranslation();
  const suggestions = [
    t("ai.suggestions.atRisk"),
    t("ai.suggestions.weekly"),
    t("ai.suggestions.whyFailed"),
    t("ai.suggestions.nextActions"),
  ];
  return (
    <div className="max-w-2xl mx-auto py-10 text-center">
      <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-ms-blue/40 to-indigo-500/40 items-center justify-center text-3xl font-bold mb-4">
        ✺
      </div>
      <div className="text-xl font-semibold mb-1">{t("ai.chat.emptyTitle")}</div>
      <p className="text-sm text-ms-muted mb-2">{t("ai.chat.welcome")}</p>
      <ul className="inline-block text-left text-sm text-ms-muted space-y-1 mb-6">
        <li>• {t("ai.chat.welcomeBullet1")}</li>
        <li>• {t("ai.chat.welcomeBullet2")}</li>
        <li>• {t("ai.chat.welcomeBullet3")}</li>
        <li>• {t("ai.chat.welcomeBullet4")}</li>
      </ul>
      <div className="text-xs text-ms-muted mb-2">{t("ai.suggestions.heading")}</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="px-3 py-1.5 rounded-full border border-ms-line bg-white/[0.02] text-xs text-ms-text hover:border-ms-blue/60 hover:bg-ms-blue/10 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[680px] bg-ms-blue/15 border border-ms-blue/30 rounded-lg rounded-tr-sm px-3.5 py-2.5">
        <div className="text-[10px] uppercase tracking-wider text-ms-muted mb-0.5">
          {t("ai.chat.you")}
        </div>
        <div className="text-sm whitespace-pre-wrap">{text}</div>
      </div>
      <Avatar name="Me" size="md" />
    </div>
  );
}

function AssistantBubble({
  msg,
  onActionUpdate,
}: {
  msg: AssistantMessage;
  onActionUpdate: (actionId: string, status: ActionCardData["status"]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ms-blue/40 to-indigo-500/40 flex items-center justify-center text-sm font-bold shrink-0">
        ✺
      </div>
      <div className="max-w-[680px] flex-1 min-w-0 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-ms-muted">
          {t("ai.chat.assistant")}
          {msg.confidence !== undefined && (
            <span className="ml-2 text-ms-muted">
              · {t("ai.confidence", { value: (msg.confidence * 100).toFixed(0) })}
            </span>
          )}
        </div>
        <div className="bg-white/[0.04] border border-ms-line rounded-lg rounded-tl-sm px-3.5 py-2.5">
          <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
          {msg.bullets && msg.bullets.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-ms-muted">
              {msg.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-ms-blue">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {msg.references && msg.references.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-ms-muted">
                {t("ai.references.label")}:
              </span>
              {msg.references.map((r, i) => (
                <ReferenceChip key={i} kind={r.kind} label={r.label} />
              ))}
            </div>
          )}
        </div>
        {msg.actions?.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            onConfirm={() => onActionUpdate(a.id, "confirmed")}
            onCancel={() => onActionUpdate(a.id, "cancelled")}
          />
        ))}
      </div>
    </div>
  );
}

function ReferenceChip({ kind, label }: { kind: ActionCardData["references"][number]["kind"]; label: string }) {
  const { t } = useTranslation();
  const tone =
    kind === "account" ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
    : kind === "opportunity" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : kind === "project" ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : "bg-violet-500/15 text-violet-300 border-violet-500/30";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${tone}`}>
      @{t(`ai.references.${kind}` as const)} · {label}
    </span>
  );
}

function ActionCard({
  action,
  onConfirm,
  onCancel,
}: {
  action: ActionCardData;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const typeMap: Record<ActionType, { label: string; icon: string; tone: string }> = {
    createTask: { label: t("ai.actionCard.typeCreateTask"), icon: "✓", tone: "bg-sky-500/20 text-sky-300" },
    sendEmail: { label: t("ai.actionCard.typeSendEmail"), icon: "✉", tone: "bg-emerald-500/20 text-emerald-300" },
    updateOpp: { label: t("ai.actionCard.typeUpdateOpp"), icon: "↻", tone: "bg-amber-500/20 text-amber-300" },
    triggerWorkflow: { label: t("ai.actionCard.typeTriggerWorkflow"), icon: "⚙", tone: "bg-violet-500/20 text-violet-300" },
  };
  const meta = typeMap[action.type];
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        action.status === "confirmed"
          ? "border-emerald-500/40 bg-emerald-500/[0.04]"
          : action.status === "cancelled"
          ? "border-ms-line/50 bg-white/[0.02] opacity-60"
          : "border-ms-blue/40 bg-ms-blue/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-ms-line/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex w-6 h-6 rounded items-center justify-center text-sm font-bold ${meta.tone}`}>
            {meta.icon}
          </span>
          <div className="text-[10px] uppercase tracking-wider text-ms-muted">
            {t("ai.actionCard.label")} · {meta.label}
          </div>
        </div>
        {action.status === "confirmed" && <Badge tone="success">{t("status.Approved")}</Badge>}
        {action.status === "cancelled" && <Badge tone="neutral">{t("ai.actionCard.cancel")}</Badge>}
      </div>
      <div className="px-3.5 py-3">
        <div className="text-sm font-medium mb-1">{action.title}</div>
        <div className="text-xs text-ms-muted whitespace-pre-wrap">{action.body}</div>
        {action.references.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {action.references.map((r, i) => (
              <ReferenceChip key={i} kind={r.kind} label={r.label} />
            ))}
          </div>
        )}
      </div>
      {action.status === "draft" && (
        <div className="flex items-center justify-end gap-2 px-3.5 py-2 bg-white/[0.02] border-t border-ms-line/40">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-ms-muted hover:text-white px-2 py-1 transition-colors"
          >
            {t("ai.actionCard.cancel")}
          </button>
          <button
            type="button"
            disabled
            title={t("common.notImplemented")}
            className="text-xs text-ms-muted px-2 py-1 cursor-not-allowed"
          >
            {t("ai.actionCard.edit")}
          </button>
          <Button variant="primary" onClick={onConfirm}>
            {t("ai.actionCard.confirm")}
          </Button>
        </div>
      )}
    </div>
  );
}

function ThinkingBubble() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ms-blue/40 to-indigo-500/40 flex items-center justify-center text-sm font-bold animate-pulse shrink-0">
        ✺
      </div>
      <div className="text-sm text-ms-muted py-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ms-blue animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-ms-blue animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ms-blue animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <span className="ml-2">{t("ai.chat.thinking")}</span>
      </div>
    </div>
  );
}
