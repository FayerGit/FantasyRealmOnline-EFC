import { useEffect, useMemo, useState } from "react";
import { ticketAPI, Ticket } from "../services/ticketAPI";

interface BanModalProps {
  banReason?: string;
  username: string;
  bannedAt?: string | null;
}

/**
 * Modal non fermable affichée aux utilisateurs bannis
 * Autorise uniquement la création d'un ticket de support
 */
export function BanModal({ banReason, username, bannedAt }: BanModalProps) {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [ticketCreated, setTicketCreated] = useState(false);

  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [isLoadingMyTickets, setIsLoadingMyTickets] = useState(false);
  const [conversationTicket, setConversationTicket] = useState<Ticket | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  const parseDateTime = (value?: string | null): number | null => {
    if (!value) return null;
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
    const ts = new Date(normalized).getTime();
    return Number.isFinite(ts) ? ts : null;
  };

  const bannedAtTs = useMemo(() => parseDateTime(bannedAt), [bannedAt]);

  const preferredTicketId = useMemo(() => {
    if (myTickets.length === 0) return null;

    // Si un ticket est encore ouvert/en cours, c'est le fil d'appel actif.
    const openTickets = myTickets.filter((t) => t.status === "open" || t.status === "in_progress");
    if (openTickets.length > 0) {
      const sorted = openTickets
        .slice()
        .sort((a, b) => {
          const aTs = parseDateTime(a.created_at) ?? 0;
          const bTs = parseDateTime(b.created_at) ?? 0;
          return bTs - aTs;
        });
      return sorted[0]?.id ?? null;
    }

    // Sinon, ne considérer que les tickets créés pendant la période du bannissement actuel.
    if (bannedAtTs != null) {
      const duringThisBan = myTickets.filter((t) => {
        const createdTs = parseDateTime(t.created_at);
        if (createdTs == null) return false;
        return createdTs >= bannedAtTs;
      });

      if (duringThisBan.length > 0) {
        const sorted = duringThisBan
          .slice()
          .sort((a, b) => {
            const aTs = parseDateTime(a.created_at) ?? 0;
            const bTs = parseDateTime(b.created_at) ?? 0;
            return bTs - aTs;
          });
        return sorted[0]?.id ?? null;
      }
    }

    // Repli : ticket le plus récent
    const sortedAll = myTickets
      .slice()
      .sort((a, b) => {
        const aTs = parseDateTime(a.created_at) ?? 0;
        const bTs = parseDateTime(b.created_at) ?? 0;
        return bTs - aTs;
      });
    return sortedAll[0]?.id ?? null;
  }, [myTickets, bannedAtTs]);

  useEffect(() => {
    void (async () => {
      setIsLoadingMyTickets(true);
      setConversationError(null);

      const result = await ticketAPI.getMyTickets();
      if (result.error) {
        setConversationError(result.error);
        setMyTickets([]);
        setIsLoadingMyTickets(false);
        return;
      }

      setMyTickets(result.tickets ?? []);
      setIsLoadingMyTickets(false);
    })();
  }, [ticketCreated, bannedAtTs]);

  const handleLoadConversation = async () => {
    setConversationError(null);

    const ticketId = preferredTicketId;
    if (!ticketId) {
      setConversationError("No ticket found yet. Submit an appeal ticket first.");
      return;
    }

    setIsLoadingConversation(true);
    const result = await ticketAPI.getTicket(ticketId);
    if (result.error) {
      setConversationError(result.error);
      setConversationTicket(null);
      setIsLoadingConversation(false);
      return;
    }

    setConversationTicket(result.ticket ?? null);
    setIsLoadingConversation(false);
  };

  const handleCreateTicket = async () => {
    setFeedback(null);

    if (!subject.trim() || !message.trim()) {
      setFeedback({ type: "error", message: "Subject and message are required" });
      return;
    }

    const result = await ticketAPI.createTicket({
      subject: subject.trim(),
      message: message.trim()
    });

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Support ticket created successfully. Our team will review it." });
      setTicketCreated(true);
      setSubject("");
      setMessage("");
      setShowTicketForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl border-2 border-red-600/60 bg-[#0a0a0a] p-8 space-y-6 relative">
        {/* Icône d'avertissement */}
        <div className="flex justify-center">
          <div className="w-20 h-20 border-4 border-red-600/60 rounded-full flex items-center justify-center">
            <span className="text-4xl text-red-500">!</span>
          </div>
        </div>

        {/* Titre */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-['Cinzel'] tracking-wider text-red-500">
            ACCOUNT BANNED
          </h1>
          <p className="text-white/70 text-sm">
            User: <span className="text-white/90">{username}</span>
          </p>
        </div>

        {/* Motif du ban */}
        <div className="border border-red-600/30 bg-red-950/20 p-4 space-y-2">
          <div className="text-xs text-red-400/90 font-semibold tracking-wide">BAN REASON:</div>
          <div className="text-sm text-white/80">
            {banReason || "Your account has been banned for violating our terms of service."}
          </div>
        </div>

        {/* Informations */}
        <div className="border border-white/20 bg-[#121212] p-4 space-y-3 text-sm">
          <p className="text-white/70">
            Your account has been banned and all access has been restricted. Your account data will be retained for 30 days.
          </p>
          <p className="text-white/70">
            If you believe this is a mistake, you may submit ONE support ticket to appeal this decision.
          </p>
        </div>

        {/* Formulaire de ticket ou bouton */}
        {!showTicketForm && !ticketCreated && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowTicketForm(true)}
              className="border border-yellow-600/50 bg-yellow-900/20 px-6 py-3 text-sm text-yellow-400/90 hover:bg-yellow-900/30 hover:border-yellow-600/70 transition-all font-['Cinzel'] tracking-wider"
            >
              Submit Appeal Ticket
            </button>
          </div>
        )}

        {showTicketForm && !ticketCreated && (
          <div className="border border-white/20 bg-[#121212] p-5 space-y-4">
            <div className="text-white font-['Cinzel'] tracking-wider">Appeal Form</div>
            
            {feedback && (
              <div className={`border p-3 text-sm ${
                feedback.type === "error" 
                  ? "border-red-500/40 bg-red-950/20 text-red-400/90" 
                  : "border-green-500/40 bg-green-950/20 text-green-400/90"
              }`}>
                {feedback.message}
              </div>
            )}

            <div>
              <label className="block text-xs text-white/70 mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Reason for appeal..."
                className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Explain why you believe this ban should be reviewed..."
                className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateTicket}
                className="flex-1 border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all"
              >
                Submit Ticket
              </button>
              <button
                onClick={() => {
                  setShowTicketForm(false);
                  setFeedback(null);
                }}
                className="border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:border-white/40 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {ticketCreated && (
          <div className="border border-green-500/40 bg-green-950/20 p-5 text-center space-y-3">
            <div className="text-green-400/90 text-sm">
              Your appeal has been submitted
            </div>
            <div className="text-white/70 text-xs">
              Our support team will review your case and respond as soon as possible.
            </div>
          </div>
        )}

        {/* Visionneuse de conversation en lecture seule */}
        <div className="border border-white/20 bg-[#121212] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white font-['Cinzel'] tracking-wider text-sm">
              Voir la réponse / conversation
            </div>
            <button
              onClick={handleLoadConversation}
              disabled={isLoadingMyTickets || isLoadingConversation || !latestTicketId}
              className="border border-white/30 px-4 py-2 text-xs text-white/80 hover:bg-white/5 hover:border-white/50 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-white/30"
            >
              {isLoadingConversation ? "Loading…" : "Load conversation"}
            </button>
          </div>

          {conversationError && (
            <div className="border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-400/90">
              {conversationError}
            </div>
          )}

          {!preferredTicketId && !isLoadingMyTickets && (
            <div className="text-xs text-white/60">
              No ticket found yet. Submit an appeal ticket above to receive and view staff replies.
            </div>
          )}

          {conversationTicket && (
            <div className="space-y-3">
              <div className="text-xs text-white/60">
                Ticket #{conversationTicket.id} • Status: {conversationTicket.status} • {new Date(conversationTicket.created_at).toLocaleString()}
              </div>

              <div className="border border-white/10 bg-[#0a0a0a] p-4">
                <div className="text-xs text-white/60 mb-2">Your message</div>
                <div className="text-sm text-white/80 whitespace-pre-wrap">{conversationTicket.message}</div>
              </div>

              {Array.isArray(conversationTicket.messages) && conversationTicket.messages.length > 0 ? (
                <div className="space-y-2">
                  {conversationTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 border ${
                        msg.is_staff_response ? "border-purple-500/20 bg-purple-500/5" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-white/60">
                          {msg.is_staff_response ? `Staff: ${msg.username}` : `You: ${msg.username}`}
                        </span>
                        <span className="text-xs text-white/40">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-white/80 text-sm whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/60">No replies yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Pas de bouton de fermeture - Modal non fermable */}
        <div className="text-center text-xs text-red-400/60">
          This window cannot be closed while your account is banned
        </div>
      </div>
    </div>
  );
}
