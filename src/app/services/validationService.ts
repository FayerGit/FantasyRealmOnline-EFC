/**
 * Utilitaires de validation de formulaire
 * Fournit une validation côté client correspondant aux règles du backend
 */

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Valider le format et la sécurité du nom d'utilisateur
 * Règles :
 * - 3 à 20 caractères
 * - Seulement alphanumériques, tirets, underscores
 * - Pas d'espaces ni de caractères spéciaux
 * - Ne peut pas commencer ou finir par un tiret/underscore
 */
export const validateUsername = (username: string): ValidationResult => {
  username = username.trim();

  if (username.length < 3) {
    return { valid: false, message: "Username must be at least 3 characters" };
  }

  if (username.length > 20) {
    return { valid: false, message: "Username must be at most 20 characters" };
  }

  // Vérifier la présence d'espaces
  if (username.includes(" ")) {
    return { valid: false, message: "Username cannot contain spaces" };
  }

  // Vérifier les caractères valides (alphanumériques, tiret, underscore uniquement)
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      message: "Username can only contain letters, numbers, hyphens, and underscores",
    };
  }

  // Ne peut pas commencer ou finir par un tiret/underscore
  if (username[0] === "-" || username[0] === "_") {
    return {
      valid: false,
      message: "Username cannot start with hyphen or underscore",
    };
  }

  if (username[username.length - 1] === "-" || username[username.length - 1] === "_") {
    return {
      valid: false,
      message: "Username cannot end with hyphen or underscore",
    };
  }

  return { valid: true, message: "" };
};

/**
 * Valider le format de l'email
 */
export const validateEmail = (email: string): ValidationResult => {
  email = email.trim();

  if (!email) {
    return { valid: false, message: "Email is required" };
  }

  // Validation d'email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: "Invalid email format" };
  }

  return { valid: true, message: "" };
};

/**
 * Valider le mot de passe selon les recommandations CNIL
 * Exigences :
 * - Au moins 8 caractères
 * - Au moins une majuscule
 * - Au moins une minuscule
 * - Au moins un chiffre
 * - Au moins un caractère spécial
 */
export const validatePassword = (password: string): ValidationResult => {
  const checks = [];

  if (password.length < 8) {
    checks.push("[x] At least 8 characters");
  } else {
    checks.push("[ok] At least 8 characters");
  }

  if (/[A-Z]/.test(password)) {
    checks.push("[ok] At least one uppercase letter");
  } else {
    checks.push("[x] At least one uppercase letter");
  }

  if (/[a-z]/.test(password)) {
    checks.push("[ok] At least one lowercase letter");
  } else {
    checks.push("[x] At least one lowercase letter");
  }

  if (/[0-9]/.test(password)) {
    checks.push("[ok] At least one number");
  } else {
    checks.push("[x] At least one number");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    checks.push("[ok] At least one special character");
  } else {
    checks.push("[x] At least one special character (!@#$%^&*...)");
  }

  const allValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return {
    valid: allValid,
    message: checks.join("\n"),
  };
};

/**
 * Valider la confirmation du mot de passe
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match" };
  }
  return { valid: true, message: "" };
};
