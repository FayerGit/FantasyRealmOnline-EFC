import { useEffect, useState } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { characterAPI } from "../services/characterAPI";
import { commentAPI } from "../services/commentAPI";
import { authAPI } from "../services/authAPI";
import { ticketAPI, Ticket } from "../services/ticketAPI";
import { API_URL } from "../config/api.config";
import { CharacterPreview } from "./CharacterPreview";
import { managementAPI } from "../services/managementAPI";

interface ManagementPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

interface Character {
  id: number;
  name: string;
  createdBy: string;
  userId: number;
  createdAt: string;
  status: "pending" | "approved" | "rejected";

  body_type?: string;
  body_color?: string;
  hair_style?: string;
  eye_type?: string;
  mouth_type?: string;
  head_clothing?: string;
  top_clothing?: string;
  legs_clothing?: string;
  shoes_clothing?: string;
  helmet?: string;
  chestplate?: string;
  leggings?: string;
  boots?: string;
  left_glove?: string;
  right_glove?: string;
  left_hand?: string;
  right_hand?: string;
  accessory_neck?: string;
  accessory_finger?: string;
  accessory_wrist?: string;
  accessory_waist?: string;
}

interface Comment {
  id: number;
  content: string;
  author: string;
  userId: number;
  characterId: number;
  createdAt: string;
  status: "pending" | "approved" | "flagged" | "rejected";
}

interface Accessory {
  id: number;
  name: string;
  type: string;
  imageUrl: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "banned";
}

type RejectTarget = {
  kind: "character" | "comment";
  id: number;
  label: string;
};

type ConfirmAction = {
  title: string;
  message: string;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void;
};

type ManagementView = "characters" | "comments" | "accessories" | "users" | "tickets";

export function ManagementPage({ onNavigate, isLoggedIn, onLogout }: ManagementPageProps) {
  const user = authAPI.getUser();
  const isStaff = user?.role === "admin" || user?.role === "employee";
  const isReadOnlyStaff = Boolean(user?.is_suspended) || Boolean(user?.is_banned);
  const actorRole = user?.role;
  const actorId = user?.id;
  const [currentView, setCurrentView] = useState<ManagementView>("characters");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Characters State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterError, setCharacterError] = useState<string | null>(null);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Accessories State
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [accessoryError, setAccessoryError] = useState<string | null>(null);
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [userError, setUserError] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Accessory Form State
  const [accessoryForm, setAccessoryForm] = useState({ name: "", type: "", imageUrl: "" });
  const [accessoryImageFile, setAccessoryImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [showAccessoryForm, setShowAccessoryForm] = useState(false);
  const [supportedCategories, setSupportedCategories] = useState<string[]>([]);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmReasonError, setConfirmReasonError] = useState<string | null>(null);

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketFilter, setTicketFilter] = useState<string>("all");

  // Load tickets
  const loadTickets = async () => {
    const result = await ticketAPI.getAllTickets(ticketFilter);
    if (result.error) {
      setTicketError(result.error);
      return;
    }
    setTickets(result.tickets ?? []);
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUserError(null);

    const result = await managementAPI.listUsers(200);
    if (result.status !== "success") {
      setUserError(result.message || "Failed to load users");
      setUsers([]);
      setIsLoadingUsers(false);
      return;
    }

    const apiUsers = Array.isArray(result.data?.users) ? result.data!.users : [];
    setUsers(
      apiUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
      }))
    );

    setIsLoadingUsers(false);
  };

  const loadAccessories = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setAccessoryError("Authentication required");
      return;
    }

    setIsLoadingAccessories(true);
    setAccessoryError(null);

    try {
      const response = await fetch(`${API_URL}/management/appearance/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok || result?.status !== "success") {
        setAccessoryError(result?.message || "Failed to load accessories");
        return;
      }

      const items = Array.isArray(result?.data?.items) ? result.data.items : [];
      const mapped: Accessory[] = items.map((item: any, index: number) => ({
        id: index + 1,
        name: item.key ?? item.file_name ?? `item-${index + 1}`,
        type: item.category ?? "unknown",
        imageUrl: item.image_url ?? "",
      }));

      setAccessories(mapped);
    } catch {
      setAccessoryError("Failed to load accessories");
    } finally {
      setIsLoadingAccessories(false);
    }
  };

  const loadSupportedCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/appearance/upload-categories`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (response.ok && result?.status === "success") {
        const categories = Array.isArray(result?.data?.categories) ? result.data.categories : [];
        setSupportedCategories(categories.slice().sort());
      }
    } catch {
      // Silently fail; use empty list
    }
  };

  useEffect(() => {
    if (!isStaff) {
      return;
    }
    
    loadSupportedCategories();
    
    const loadCharacters = async () => {
      const result = await characterAPI.getPendingCharacters();
      if (result.error) {
        setCharacterError(result.error);
        return;
      }
      const mapped = (result.characters ?? []).map((char) => ({
        id: char.id,
        name: char.name,
        createdBy: char.creator ?? "Unknown",
        userId: char.user_id ?? 0,
        createdAt: char.created_at ?? "Unknown",
        status: (char.status as Character["status"]) ?? "pending",

        body_type: char.body_type,
        body_color: char.body_color,
        hair_style: char.hair_style,
        eye_type: char.eye_type,
        mouth_type: char.mouth_type,
        head_clothing: char.head_clothing,
        top_clothing: char.top_clothing,
        legs_clothing: char.legs_clothing,
        shoes_clothing: char.shoes_clothing,
        helmet: char.helmet,
        chestplate: char.chestplate,
        leggings: char.leggings,
        boots: char.boots,
        left_glove: char.left_glove,
        right_glove: char.right_glove,
        left_hand: char.left_hand,
        right_hand: char.right_hand,
        accessory_neck: char.accessory_neck,
        accessory_finger: char.accessory_finger,
        accessory_wrist: char.accessory_wrist,
        accessory_waist: char.accessory_waist,
      }));
      setCharacters(mapped);
    };

    const loadComments = async () => {
      const result = await commentAPI.getPendingComments();
      if (result.error) {
        setCommentError(result.error);
        return;
      }
      const mapped = (result.comments ?? []).map((comment) => ({
        id: comment.id,
        content: comment.comment ?? "",
        author: comment.author ?? "Unknown",
        userId: comment.user_id,
        characterId: comment.character_id,
        createdAt: comment.created_at,
        status: (comment.status as Comment["status"]) ?? "pending",
      }));
      setComments(mapped);
    };

    loadCharacters();
    loadComments();
    
    // Load tickets only when viewing tickets
    if (currentView === "tickets") {
      loadTickets();
    }

    if (currentView === "accessories") {
      loadAccessories();
    }

    if (currentView === "users") {
      loadUsers();
    }
  }, [isStaff, currentView, ticketFilter]);

  if (!isStaff) {
    return (
      <WireframeLayout onNavigate={onNavigate} currentPage="management" isLoggedIn={isLoggedIn} onLogout={onLogout}>
        <div className="border border-red-500/30 p-6 text-sm text-center text-red-400/90 bg-red-500/5">
          Forbidden. This area is reserved for staff.
        </div>
      </WireframeLayout>
    );
  }

  const ensureCanAct = (): boolean => {
    if (isReadOnlyStaff) {
      setFeedback({
        type: "error",
        message: "Your staff account is suspended/banned. You can view, but you cannot perform management actions.",
      });
      return false;
    }
    return true;
  };

  // Character Actions
  const handleApproveCharacter = async (id: number) => {
    if (!ensureCanAct()) return;
    const character = characters.find(c => c.id === id);
    if (!character) return;

    const result = await characterAPI.approveCharacter(id);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setCharacters(characters.map(c => c.id === id ? { ...c, status: "approved" as const } : c));
    setFeedback({ type: "success", message: `Character "${character.name}" approved successfully` });
    window.dispatchEvent(new Event("notifications:changed"));
  };

  const handleRejectCharacter = (id: number) => {
    if (!ensureCanAct()) return;
    const character = characters.find(c => c.id === id);
    if (!character) return;

    setRejectTarget({ kind: "character", id, label: character.name });
    setRejectReason("");
  };

  // Comment Actions
  const handleApproveComment = async (id: number) => {
    if (!ensureCanAct()) return;
    const comment = comments.find(c => c.id === id);
    if (!comment) return;

    const result = await commentAPI.approveComment(id);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setComments(comments.map(c => c.id === id ? { ...c, status: "approved" as const } : c));
    setFeedback({ type: "success", message: "Comment approved" });
  };

  const handleRejectComment = (id: number) => {
    if (!ensureCanAct()) return;
    const comment = comments.find(c => c.id === id);
    if (!comment) return;

    setRejectTarget({ kind: "comment", id, label: comment.content.slice(0, 32) + (comment.content.length > 32 ? "..." : "") });
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!ensureCanAct()) return;
    if (!rejectTarget) return;
    const reason = rejectReason.trim();

    if (!reason) {
      setFeedback({ type: "error", message: "Rejection reason is required" });
      return;
    }

    if (rejectTarget.kind === "character") {
      const result = await characterAPI.rejectCharacter(rejectTarget.id, reason);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      setCharacters(characters.map(c => c.id === rejectTarget.id ? { ...c, status: "rejected" as const } : c));
      setFeedback({ type: "success", message: `Character "${rejectTarget.label}" rejected` });
      window.dispatchEvent(new Event("notifications:changed"));
    } else {
      const result = await commentAPI.rejectComment(rejectTarget.id, reason);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      setComments(comments.map(c => c.id === rejectTarget.id ? { ...c, status: "rejected" as const } : c));
      setFeedback({ type: "success", message: "Comment rejected" });
      window.dispatchEvent(new Event("notifications:changed"));
    }

    setRejectTarget(null);
    setRejectReason("");
  };

  const handleRejectCancel = () => {
    setRejectTarget(null);
    setRejectReason("");
  };

  const openConfirmAction = (action: ConfirmAction) => {
    setConfirmReason("");
    setConfirmReasonError(null);
    setConfirmAction(action);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const reason = confirmReason.trim();
    if (confirmAction.requiresReason && !reason) {
      setConfirmReasonError("Reason is required");
      return;
    }

    confirmAction.onConfirm(reason || undefined);
    setConfirmAction(null);
    setConfirmReason("");
    setConfirmReasonError(null);
  };

  const handleConfirmCancel = () => {
    setConfirmAction(null);
    setConfirmReason("");
    setConfirmReasonError(null);
  };

  const handleDeleteComment = (id: number) => {
    if (!ensureCanAct()) return;
    openConfirmAction({
      title: "Delete Comment",
      message: "Delete this comment? This action cannot be undone.",
      onConfirm: () => {
        setComments(comments.filter(c => c.id !== id));
        setFeedback({ type: "success", message: `Comment deleted` });
      }
    });
    
    // TODO: API call
    // await fetch(`/api/management/comments/${id}`, { method: 'DELETE' });
  };

  const handleFlagComment = (id: number) => {
    if (!ensureCanAct()) return;
    setComments(comments.map(c => c.id === id ? { ...c, status: "flagged" as const } : c));
    setFeedback({ type: "success", message: `Comment flagged for review` });
    
    // TODO: API call
    // await fetch(`/api/management/comments/${id}/flag`, { method: 'POST' });
  };

  // Ticket Actions
  const handleViewTicket = async (id: number) => {
    const result = await ticketAPI.getTicket(id);
    if (result.error) {
      setTicketError(result.error);
      return;
    }
    setSelectedTicket(result.ticket ?? null);
    setTicketReply("");
  };

  const handleReplyToTicket = async () => {
    if (!ensureCanAct()) return;
    if (!selectedTicket || !ticketReply.trim()) {
      setTicketError("Reply message is required");
      return;
    }

    const result = await ticketAPI.replyToTicket(selectedTicket.id, { message: ticketReply.trim() });
    if (result.error) {
      setTicketError(result.error);
      return;
    }

    setFeedback({ type: "success", message: "Reply sent" });
    setTicketReply("");
    
    // Reload ticket to show new message
    await handleViewTicket(selectedTicket.id);
  };

  const handleUpdateTicketStatus = async (id: number, status: string) => {
    if (!ensureCanAct()) return;
    const result = await ticketAPI.updateTicketStatus(id, status);
    if (result.error) {
      setTicketError(result.error);
      return;
    }

    const newStatus = status as 'open' | 'in_progress' | 'resolved' | 'closed';
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
    setFeedback({ type: "success", message: `Ticket status updated to ${status}` });
  };

  const handleAssignTicket = async (id: number, assignedTo: number) => {
    if (!ensureCanAct()) return;
    const result = await ticketAPI.assignTicket(id, assignedTo);
    if (result.error) {
      setTicketError(result.error);
      return;
    }

    // Reload tickets to get updated assigned_to_username
    await loadTickets();
    if (selectedTicket && selectedTicket.id === id) {
      await handleViewTicket(id);
    }
    setFeedback({ type: "success", message: "Ticket assigned" });
  };

  const handleToggleTicketUserBan = () => {
    if (!ensureCanAct()) return;
    if (!selectedTicket) return;

    const targetUserId = selectedTicket.user_id;
    if (!targetUserId) {
      setTicketError("Cannot determine ticket user");
      return;
    }

    const currentlyBanned = Boolean(selectedTicket.is_banned);
    const nextBanned = !currentlyBanned;
    const username = selectedTicket.user_username || "Unknown";

    openConfirmAction({
      title: nextBanned ? "Ban User" : "Unban User",
      message: nextBanned
        ? `Ban user "${username}"? This is a severe action.`
        : `Unban user "${username}"?`,
      requiresReason: nextBanned,
      reasonLabel: "Ban reason (visible to the player)",
      reasonPlaceholder: "Explain why this user is being banned...",
      onConfirm: (reason) => {
        void (async () => {
          const result = await managementAPI.setUserBanned(targetUserId, nextBanned, nextBanned ? reason : undefined);
          if (result.status !== "success") {
            setTicketError(result.message || (nextBanned ? "Failed to ban user" : "Failed to unban user"));
            return;
          }

          setSelectedTicket({
            ...selectedTicket,
            is_banned: nextBanned,
          });
          setTickets(tickets.map((t) => (t.id === selectedTicket.id ? { ...t, is_banned: nextBanned } : t)));
          setFeedback({
            type: "success",
            message: nextBanned ? `User "${username}" banned` : `User "${username}" unbanned`,
          });
        })();
      },
    });
  };

  const handleCloseTicketDetail = () => {
    setSelectedTicket(null);
    setTicketReply("");
    setTicketError(null);
  };

  // Accessory Actions
  const uploadAccessoryImage = async (
    file: File,
    meta?: { category?: string; name?: string }
  ): Promise<string | null> => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setFeedback({ type: "error", message: "Authentication required" });
      return null;
    }

    const formData = new FormData();
    formData.append("image", file);
    if (meta?.category) {
      formData.append("category", meta.category);
    }
    if (meta?.name) {
      formData.append("name", meta.name);
    }

    setIsUploadingImage(true);
    try {
      const response = await fetch(`${API_URL}/files/accessory-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || result?.status !== "success") {
        setFeedback({ type: "error", message: result?.message || "Failed to upload image" });
        return null;
      }

      return result?.data?.image_url || null;
    } catch {
      setFeedback({ type: "error", message: "Failed to upload image" });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateAccessory = async () => {
    if (!ensureCanAct()) return;
    setFeedback(null);

    if (!accessoryForm.name || !accessoryForm.type || !accessoryImageFile) {
      setFeedback({ type: "error", message: "Name, type and image file are required" });
      return;
    }

    const uploadedImageUrl = await uploadAccessoryImage(accessoryImageFile, {
      category: accessoryForm.type,
      name: accessoryForm.name,
    });
    if (!uploadedImageUrl) {
      return;
    }

    setFeedback({ type: "success", message: `Accessory "${accessoryForm.name}" created successfully` });
    setAccessoryForm({ name: "", type: "", imageUrl: "" });
    setAccessoryImageFile(null);
    setShowAccessoryForm(false);

    await loadAccessories();
    
    // TODO: API call
    // await fetch('/api/management/accessories', { method: 'POST', body: JSON.stringify(newAccessory) });
  };

  const handleEditAccessory = async () => {
    if (!ensureCanAct()) return;
    if (!editingAccessory) return;
    setFeedback(null);

    if (!accessoryForm.name || !accessoryForm.type) {
      setFeedback({ type: "error", message: "Name and type are required" });
      return;
    }

    let imageUrlToUse = accessoryForm.imageUrl;
    if (accessoryImageFile) {
      const uploadedImageUrl = await uploadAccessoryImage(accessoryImageFile, {
        category: accessoryForm.type,
        name: accessoryForm.name,
      });
      if (!uploadedImageUrl) {
        return;
      }
      imageUrlToUse = uploadedImageUrl;
    }

    setFeedback({ type: "success", message: `Accessory "${accessoryForm.name}" updated successfully` });
    setAccessoryForm({ name: "", type: "", imageUrl: "" });
    setAccessoryImageFile(null);
    setEditingAccessory(null);
    setShowAccessoryForm(false);

    await loadAccessories();
    
    // TODO: API call
    // await fetch(`/api/management/accessories/${editingAccessory.id}`, { method: 'PUT', body: JSON.stringify(updatedAccessory) });
  };

  const handleDeleteAccessory = (id: number) => {
    if (!ensureCanAct()) return;
    const accessory = accessories.find(a => a.id === id);
    if (!accessory) return;

    openConfirmAction({
      title: "Delete Accessory",
      message: `Delete accessory "${accessory.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setFeedback({ type: "error", message: "Authentication required" });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/management/appearance/item`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ category: accessory.type, key: accessory.name }),
          });

          const result = await response.json();
          if (!response.ok || result?.status !== "success") {
            setFeedback({ type: "error", message: result?.message || "Failed to delete" });
            return;
          }

          setFeedback({ type: "success", message: `Accessory "${accessory.name}" deleted` });
          await loadAccessories();
        } catch {
          setFeedback({ type: "error", message: "Failed to delete" });
        }
      }
    });
    
    // TODO: API call
    // await fetch(`/api/management/accessories/${id}`, { method: 'DELETE' });
  };

  const openEditAccessory = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setAccessoryForm({ name: accessory.name, type: accessory.type, imageUrl: accessory.imageUrl });
    setAccessoryImageFile(null);
    setShowAccessoryForm(true);
    setFeedback(null);
  };

  // User Actions
  const canModerateUser = (target: User): boolean => {
    if (actorId != null && target.id === actorId) return false;
    return target.role === "player";
  };

  const handleSuspendUser = async (id: number) => {
    if (!ensureCanAct()) return;
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (!canModerateUser(user)) {
      setFeedback({ type: "error", message: "Forbidden: You cannot manage admin/employee accounts here" });
      return;
    }

    if (user.status === "banned") {
      setFeedback({ type: "error", message: "Banned users cannot be suspended/activated" });
      return;
    }

    const isSuspended = user.status === "active";
    openConfirmAction({
      title: isSuspended ? "Suspend User" : "Reactivate User",
      message: isSuspended
        ? `Suspend user "${user.username}"? The reason will be shown to the user.`
        : `Reactivate user "${user.username}"?`,
      requiresReason: isSuspended,
      reasonLabel: "Suspension reason (visible to the player)",
      reasonPlaceholder: "Explain why this user is being suspended...",
      onConfirm: (reason) => {
        void (async () => {
          const result = await managementAPI.setUserSuspended(id, isSuspended, isSuspended ? reason : undefined);
          if (result.status !== "success") {
            setFeedback({ type: "error", message: result.message || "Failed to update user" });
            return;
          }

          setFeedback({ type: "success", message: `User "${user.username}" ${isSuspended ? "suspended" : "reactivated"}` });
          await loadUsers();
        })();
      },
    });
  };

  const handleBanUser = (id: number) => {
    if (!ensureCanAct()) return;
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (!canModerateUser(user)) {
      setFeedback({ type: "error", message: "Forbidden: You cannot manage admin/employee accounts here" });
      return;
    }

    openConfirmAction({
      title: "Ban User",
      message: `Ban user "${user.username}"? This is a severe action.`,
      requiresReason: true,
      reasonLabel: "Ban reason (visible to the player)",
      reasonPlaceholder: "Explain why this user is being banned...",
      onConfirm: (reason) => {
        void (async () => {
          const result = await managementAPI.setUserBanned(id, true, reason);
          if (result.status !== "success") {
            setFeedback({ type: "error", message: result.message || "Failed to ban user" });
            return;
          }
          setFeedback({ type: "success", message: `User "${user.username}" banned` });
          await loadUsers();
        })();
      },
    });
  };

  const handleDeleteUserData = (id: number) => {
    if (!ensureCanAct()) return;
    const user = users.find(u => u.id === id);
    if (!user) return;

    openConfirmAction({
      title: "Delete User Data",
      message: `Delete all data for user "${user.username}"? This action cannot be undone.`,
      onConfirm: () => {
        setFeedback({ type: "success", message: `Data for user "${user.username}" deleted` });
      }
    });
    
    // TODO: API call
    // await fetch(`/api/management/users/${id}/data`, { method: 'DELETE' });
  };

  const handleDeleteUserAccount = (id: number) => {
    if (!ensureCanAct()) return;
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (!canModerateUser(user)) {
      setFeedback({ type: "error", message: "Forbidden: You cannot manage admin/employee accounts here" });
      return;
    }

    openConfirmAction({
      title: "Delete Account",
      message: `DELETE ACCOUNT for user "${user.username}"? This action CANNOT be undone!`,
      onConfirm: () => {
        void (async () => {
          const result = await managementAPI.deleteUser(id);
          if (result.status !== "success") {
            setFeedback({ type: "error", message: result.message || "Failed to delete user" });
            return;
          }
          setFeedback({ type: "success", message: `Account "${user.username}" permanently deleted` });
          await loadUsers();
        })();
      },
    });
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="management" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="flex gap-6 h-full">
        {/* Control Panel */}
        <div className="w-64 border border-white/20 p-4 space-y-2 bg-[#121212]">
          <div className="border-b border-white/20 pb-3 text-lg mb-4 text-white font-['Cinzel'] tracking-wider">
            Gestion Menu
          </div>
          <button 
            onClick={() => { setCurrentView("characters"); setFeedback(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "characters" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/30 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Characters to Validate
          </button>
          <button 
            onClick={() => { setCurrentView("comments"); setFeedback(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "comments" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Comments
          </button>
          <button 
            onClick={() => { setCurrentView("accessories"); setFeedback(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "accessories" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Accessories
          </button>
          <button 
            onClick={() => { setCurrentView("users"); setFeedback(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "users" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Users
          </button>
          <button 
            onClick={() => { setCurrentView("tickets"); setFeedback(null); setSelectedTicket(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "tickets" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Support Tickets
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 border border-white/20 p-6 space-y-4 bg-[#121212] overflow-y-auto">
          {/* Feedback Messages */}
          {feedback && (
            <div className={`border p-3 ${
              feedback.type === "success" 
                ? "border-green-500/30 bg-green-500/5 text-green-400/90" 
                : "border-red-500/30 bg-red-500/5 text-red-400/90"
            }`}>
              {feedback.message}
            </div>
          )}

          {/* Characters View */}
          {currentView === "characters" && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                Characters to Validate ({characters.filter(c => c.status === "pending").length} pending)
              </h2>

              <div className="space-y-2">
                {characterError ? (
                  <div className="border border-red-500/30 p-4 text-sm text-center text-red-400/90 bg-red-500/5">
                    {characterError}
                  </div>
                ) : characters.filter(c => c.status === "pending").length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    No pending characters to validate
                  </div>
                ) : (
                  characters.filter(c => c.status === "pending").map((char) => (
                    <div key={char.id} className="border border-white/20 p-4 flex items-center justify-between bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-white/30 transition-all duration-300">
                      <div className="flex gap-4 items-center">
                        <div className="border border-white/20 w-16 h-16 bg-[#121212] overflow-hidden">
                          <CharacterPreview character={char} recolorScale={0.2} className="w-full h-full" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-white/90 font-semibold">{char.name}</div>
                          <div className="text-xs text-white/60">Created by: {char.createdBy} (ID: {char.userId})</div>
                          <div className="text-xs text-white/60">Date: {char.createdAt}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveCharacter(char.id)}
                          className="border border-green-500/30 px-4 py-2 text-sm text-green-400/90 hover:bg-green-500/5 hover:border-green-500/50 transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectCharacter(char.id)}
                          className="border border-red-500/30 px-4 py-2 text-sm text-red-400/90 hover:bg-red-500/5 hover:border-red-500/50 transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Comments View */}
          {currentView === "comments" && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                Comments Moderation ({comments.filter(c => c.status === "pending" || c.status === "flagged").length} to review)
              </h2>

              <div className="space-y-2">
                {commentError ? (
                  <div className="border border-red-500/30 p-4 text-sm text-center text-red-400/90 bg-red-500/5">
                    {commentError}
                  </div>
                ) : comments.filter(c => c.status === "pending" || c.status === "flagged").length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    No comments to moderate
                  </div>
                ) : (
                  comments.filter(c => c.status === "pending" || c.status === "flagged").map((comment) => (
                    <div key={comment.id} className={`border p-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] transition-all duration-300 ${
                      comment.status === "flagged" ? "border-yellow-500/30" : "border-white/20 hover:border-white/30"
                    }`}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-white/90">{comment.content}</div>
                            <div className="text-xs text-white/60 mt-1">
                              By: {comment.author} (ID: {comment.userId}) • Character ID: {comment.characterId} • {comment.createdAt}
                            </div>
                            {comment.status === "flagged" && (
                              <div className="text-xs text-yellow-400/90 mt-1">FLAGGED</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {comment.status === "pending" && (
                            <button 
                              onClick={() => handleApproveComment(comment.id)}
                              className="border border-green-500/30 px-3 py-1.5 text-xs text-green-400/90 hover:bg-green-500/5 hover:border-green-500/50 transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {comment.status === "pending" && (
                            <button 
                              onClick={() => handleRejectComment(comment.id)}
                              className="border border-red-500/30 px-3 py-1.5 text-xs text-red-400/90 hover:bg-red-500/5 hover:border-red-500/50 transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Accessories View */}
          {currentView === "accessories" && (
            <>
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <h2 className="text-lg text-white font-['Cinzel'] tracking-wider">
                  Accessories ({accessories.length})
                </h2>
                <button 
                  onClick={() => { 
                    setShowAccessoryForm(true); 
                    setEditingAccessory(null);
                    setAccessoryForm({ name: "", type: "", imageUrl: "" });
                    setAccessoryImageFile(null);
                    setFeedback(null);
                  }}
                  className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                >
                  + Create New
                </button>
              </div>

              {showAccessoryForm && (
                <div className="border border-white/30 p-4 bg-[#0a0a0a] space-y-3">
                  <h3 className="text-base text-white/90 font-['Cinzel']">
                    {editingAccessory ? "Edit Accessory" : "Create New Accessory"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/70 mb-2">Name *</label>
                      <input
                        type="text"
                        value={accessoryForm.name}
                        onChange={(e) => setAccessoryForm({ ...accessoryForm, name: e.target.value })}
                        placeholder="Dragon Sword"
                        className="w-full bg-[#121212] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-2">Type *</label>
                      <select
                        value={accessoryForm.type}
                        onChange={(e) => setAccessoryForm({ ...accessoryForm, type: e.target.value })}
                        className="w-full bg-[#121212] border border-white/30 px-3 py-2 text-sm text-white/90 focus:border-white/50 focus:outline-none"
                      >
                        <option value="">Select a category...</option>
                        {supportedCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Image File {editingAccessory ? "(optional)" : "*"}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAccessoryImageFile(e.target.files?.[0] || null)}
                      className="w-full bg-[#121212] border border-white/30 px-3 py-2 text-sm text-white/90 file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white/80"
                    />
                    {editingAccessory && !accessoryImageFile && accessoryForm.imageUrl && (
                      <p className="text-xs text-white/50 mt-2">Current image kept if no file selected.</p>
                    )}
                    {accessoryImageFile && (
                      <p className="text-xs text-white/60 mt-2">Selected: {accessoryImageFile.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={editingAccessory ? handleEditAccessory : handleCreateAccessory}
                      disabled={isUploadingImage}
                      className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                    >
                      {isUploadingImage ? "Uploading..." : editingAccessory ? "Save Changes" : "Create Accessory"}
                    </button>
                    <button 
                      onClick={() => {
                        setShowAccessoryForm(false);
                        setEditingAccessory(null);
                        setAccessoryForm({ name: "", type: "", imageUrl: "" });
                        setAccessoryImageFile(null);
                        setFeedback(null);
                      }}
                      className="border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {isLoadingAccessories ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    Loading...
                  </div>
                ) : accessoryError ? (
                  <div className="border border-red-500/40 bg-red-500/10 p-3 text-red-400 text-xs rounded">
                    {accessoryError}
                  </div>
                ) : accessories.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    No accessories found. Create one to get started.
                  </div>
                ) : (
                  accessories.map((accessory) => (
                    <div key={accessory.id} className="border border-white/20 p-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-white/30 transition-all duration-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="w-14 h-14 border border-white/20 bg-[#121212] overflow-hidden flex-shrink-0">
                            <img src={accessory.imageUrl} alt={accessory.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                          <div className="text-sm text-white/90 font-semibold">{accessory.name}</div>
                          <div className="text-xs text-white/60 mt-1">Type: {accessory.type}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button 
                            onClick={() => openEditAccessory(accessory)}
                            className="border border-white/30 px-3 py-1.5 text-xs text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteAccessory(accessory.id)}
                            className="border border-red-500/30 px-3 py-1.5 text-xs text-red-400/90 hover:bg-red-500/5 hover:border-red-500/50 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Users View */}
          {currentView === "users" && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                User Management ({users.length} users)
              </h2>

              <div className="space-y-2">
                {isLoadingUsers ? (
                  <div className="text-white/60 text-sm text-center py-8">Loading...</div>
                ) : userError ? (
                  <div className="border border-red-500/40 bg-red-500/10 p-3 text-red-400 text-sm rounded">
                    {userError}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    No users found
                  </div>
                ) : (
                  users.map((user) => {
                    const canModerate = !isReadOnlyStaff && canModerateUser(user);

                    return (
                      <div key={user.id} className="border border-white/20 p-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-white/30 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center">
                            <div className="border border-white/20 w-12 h-12 flex items-center justify-center text-xs bg-[#121212] text-white/40 rounded-full">
                              {user.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm text-white/90 font-semibold">{user.username}</div>
                              <div className="text-xs text-white/60">{user.email} • Role: {user.role}</div>
                              <div className="text-xs">
                                Status: <span className={
                                  user.status === "active" ? "text-green-400/90" :
                                  user.status === "suspended" ? "text-yellow-400/90" :
                                  "text-red-400/90"
                                }>
                                  {user.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSuspendUser(user.id)}
                              className={`border px-3 py-2 text-sm transition-all cursor-pointer ${
                                user.status === "active"
                                  ? "border-yellow-500/30 text-yellow-400/90 hover:bg-yellow-500/5 hover:border-yellow-500/50"
                                  : "border-green-500/30 text-green-400/90 hover:bg-green-500/5 hover:border-green-500/50"
                              }`}
                              disabled={!canModerate || user.status === "banned"}
                            >
                              {user.status === "active" ? "Suspend" : user.status === "suspended" ? "Activate" : "Banned"}
                            </button>
                            <button
                              onClick={() => handleBanUser(user.id)}
                              className="border border-orange-500/30 px-3 py-2 text-sm text-orange-400/90 hover:bg-orange-500/5 hover:border-orange-500/50 transition-all cursor-pointer"
                              disabled={!canModerate || user.status === "banned"}
                            >
                              Ban
                            </button>
                            <button
                              onClick={() => handleDeleteUserData(user.id)}
                              className="border border-red-500/30 px-3 py-2 text-sm text-red-400/90 hover:bg-red-500/5 hover:border-red-500/50 transition-all cursor-pointer"
                              disabled={!canModerate}
                            >
                              Delete Data
                            </button>
                            <button
                              onClick={() => handleDeleteUserAccount(user.id)}
                              className="border border-red-700/50 px-3 py-2 text-sm text-red-500/90 hover:bg-red-700/10 hover:border-red-700/70 transition-all cursor-pointer"
                              disabled={!canModerate}
                            >
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Tickets View */}
          {currentView === "tickets" && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-white font-['Cinzel'] tracking-wider text-xl">Support Tickets</h3>
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  className="bg-[#121212] border border-white/30 px-4 py-2 text-sm text-white/90 focus:border-white/50 focus:outline-none"
                >
                  <option value="all">All Tickets</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {ticketError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  {ticketError}
                </div>
              )}

              {selectedTicket ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleCloseTicketDetail}
                      className="border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:border-white/50 transition-all"
                    >
                      Back to List
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleToggleTicketUserBan}
                        className={`border px-4 py-2 text-sm transition-all ${
                          selectedTicket.is_banned
                            ? "border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-green-500/50"
                            : "border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50"
                        }`}
                      >
                        {selectedTicket.is_banned ? "Unban" : "Ban"}
                      </button>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                        className="bg-[#121212] border border-white/30 px-3 py-2 text-sm text-white/90 focus:border-white/50 focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-white/20 bg-[#0a0a0a] p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-['Cinzel'] text-lg mb-2">{selectedTicket.subject}</h4>
                        <div className="flex gap-3 text-xs text-white/60">
                          <span>Ticket #{selectedTicket.id}</span>
                          <span>•</span>
                          <span>User: {selectedTicket.user_username || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 text-xs border ${
                          selectedTicket.status === "open" ? "border-blue-500/40 text-blue-400" :
                          selectedTicket.status === "in_progress" ? "border-yellow-500/40 text-yellow-400" :
                          selectedTicket.status === "resolved" ? "border-green-500/40 text-green-400" :
                          "border-gray-500/40 text-gray-400"
                        }`}>
                          {selectedTicket.status}
                        </span>
                        <span className={`px-3 py-1 text-xs border ${
                          selectedTicket.priority === "high" ? "border-red-500/40 text-red-400" :
                          selectedTicket.priority === "medium" ? "border-orange-500/40 text-orange-400" :
                          "border-green-500/40 text-green-400"
                        }`}>
                          {selectedTicket.priority}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <div className="text-white/80 text-sm whitespace-pre-wrap">{selectedTicket.message}</div>
                    </div>

                    {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                      <div className="border-t border-white/10 pt-4 space-y-3">
                        <h5 className="text-white/70 font-['Cinzel'] text-sm">Conversation</h5>
                        {selectedTicket.messages.map((msg) => (
                          <div key={msg.id} className={`p-4 border ${
                            msg.is_staff_response ? "border-purple-500/20 bg-purple-500/5" : "border-white/10 bg-white/5"
                          }`}>
                            <div className="flex justify-between mb-2">
                              <span className="text-xs text-white/60">
                                {msg.is_staff_response ? `Staff: ${msg.username}` : `User: ${msg.username}`}
                              </span>
                              <span className="text-xs text-white/40">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-white/80 text-sm whitespace-pre-wrap">{msg.message}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-4">
                      <label className="block text-xs text-white/70 mb-2">Staff Reply</label>
                      <textarea
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        rows={4}
                        placeholder="Type your reply..."
                        className="w-full bg-[#121212] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none resize-none"
                      />
                      <button
                        onClick={handleReplyToTicket}
                        className="mt-2 border border-purple-500/30 px-4 py-2 text-sm text-purple-400/90 hover:bg-purple-500/5 hover:border-purple-500/50 transition-all"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.length === 0 ? (
                    <div className="text-white/60 text-sm text-center py-8">
                      No tickets found.
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        onClick={() => handleViewTicket(ticket.id)}
                        className="border border-white/20 bg-[#0a0a0a] p-4 hover:border-white/40 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-white font-['Cinzel'] text-sm mb-1">{ticket.subject}</h4>
                            <div className="flex gap-3 text-xs text-white/50">
                              <span>Ticket #{ticket.id}</span>
                              <span>•</span>
                              <span>User: {ticket.user_username || 'Unknown'}</span>
                              <span>•</span>
                              <span>{new Date(ticket.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs border ${
                              ticket.status === "open" ? "border-blue-500/40 text-blue-400" :
                              ticket.status === "in_progress" ? "border-yellow-500/40 text-yellow-400" :
                              ticket.status === "resolved" ? "border-green-500/40 text-green-400" :
                              "border-gray-500/40 text-gray-400"
                            }`}>
                              {ticket.status}
                            </span>
                            <span className={`px-2 py-1 text-xs border ${
                              ticket.priority === "high" ? "border-red-500/40 text-red-400" :
                              ticket.priority === "medium" ? "border-orange-500/40 text-orange-400" :
                              "border-green-500/40 text-green-400"
                            }`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                        <div className="text-white/60 text-sm line-clamp-2">{ticket.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {rejectTarget && (
          <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-lg border border-white/20 bg-[#121212] p-5 space-y-4">
              <div className="text-white font-['Cinzel'] tracking-wider text-lg">Reject {rejectTarget.kind}</div>
              <div className="text-white/70 text-sm">
                Provide a reason for rejecting: <span className="text-white/90">{rejectTarget.label}</span>
              </div>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                placeholder="Reason..."
                className="w-full bg-[#0a0a0a] border border-white/30 p-3 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleRejectCancel}
                  className="border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:border-white/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="border border-red-500/40 px-4 py-2 text-sm text-red-400/90 hover:bg-red-500/10 hover:border-red-500/60 transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmAction && (
          <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md border border-white/20 bg-[#121212] p-5 space-y-4">
              <div className="text-white font-['Cinzel'] tracking-wider text-lg">{confirmAction.title}</div>
              <div className="text-white/70 text-sm">
                {confirmAction.message}
              </div>
              {confirmAction.requiresReason && (
                <div className="space-y-2">
                  <div className="text-xs text-white/70">
                    {confirmAction.reasonLabel || "Reason (visible to the user)"}
                  </div>
                  <textarea
                    value={confirmReason}
                    onChange={(event) => {
                      setConfirmReason(event.target.value);
                      if (confirmReasonError) setConfirmReasonError(null);
                    }}
                    rows={4}
                    placeholder={confirmAction.reasonPlaceholder || "Reason..."}
                    className={`w-full bg-[#0a0a0a] border p-3 text-sm text-white/90 placeholder-white/40 focus:outline-none resize-none ${
                      confirmReasonError ? "border-red-500/60 focus:border-red-500/70" : "border-white/30 focus:border-white/50"
                    }`}
                  />
                  {confirmReasonError && (
                    <div className="text-xs text-red-400/90">{confirmReasonError}</div>
                  )}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleConfirmCancel}
                  className="border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:border-white/50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="border border-red-500/40 px-4 py-2 text-sm text-red-400/90 hover:bg-red-500/10 hover:border-red-500/60 transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WireframeLayout>
  );
}
