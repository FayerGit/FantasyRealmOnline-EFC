import { useState, useEffect } from "react";
import { authAPI } from "../services/authAPI";

export interface UserStatus {
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  suspendReason?: string;
  canCreate: boolean;
  canComment: boolean;
  canInteract: boolean;
}

/**
 * Hook pour obtenir le statut actuel de l'utilisateur (banni/suspendu)
 * et vérifier les permissions pour les actions
 */
export function useUserStatus(): UserStatus {
  const [status, setStatus] = useState<UserStatus>({
    isBanned: false,
    isSuspended: false,
    canCreate: true,
    canComment: true,
    canInteract: true
  });

  useEffect(() => {
    const checkStatus = async () => {
      const user = authAPI.getUser();
      
      if (!user) {
        setStatus({
          isBanned: false,
          isSuspended: false,
          canCreate: false,
          canComment: false,
          canInteract: false
        });
        return;
      }

      // Récupérer les données utilisateur actuelles pour obtenir le statut le plus récent
      const response = await authAPI.getCurrentUser();
      
      if (response.status === "success" && response.data?.user) {
        const userData = response.data.user;
        const isBanned = userData.is_banned || false;
        const isSuspended = userData.is_suspended || false;
        
        setStatus({
          isBanned,
          isSuspended,
          banReason: userData.ban_reason,
          suspendReason: userData.suspend_reason,
          // Les utilisateurs bannis ne peuvent rien faire sauf créer des tickets
          canCreate: !isBanned && !isSuspended,
          canComment: !isBanned && !isSuspended,
          canInteract: !isBanned && !isSuspended
        });
      }
    };

    checkStatus();
  }, []);

  return status;
}

/**
 * Vérifier si l'utilisateur peut effectuer une action et retourner un message d'erreur si non
 */
export function checkUserPermission(
  userStatus: UserStatus, 
  action: 'create' | 'comment' | 'interact'
): { allowed: boolean; message?: string } {
  if (userStatus.isBanned) {
    return {
      allowed: false,
      message: "Your account is banned. You cannot perform this action."
    };
  }

  if (userStatus.isSuspended) {
    return {
      allowed: false,
      message: `Your account is suspended. ${userStatus.suspendReason || "You cannot create content or interact while suspended."}`
    };
  }

  return { allowed: true };
}
