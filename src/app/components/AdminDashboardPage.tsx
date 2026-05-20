import { useEffect, useMemo, useState } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { adminAPI } from "../services/adminAPI";
import { validateEmail, validatePassword, validatePasswordMatch, validateUsername } from "../services/validationService";

interface AdminDashboardPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

interface Employee {
  id: number;
  username: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  createdAt: string;
}

type ConfirmAction = {
  title: string;
  message: string;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void;
};

type AdminView = "list" | "create" | "edit";

export function AdminDashboardPage({ onNavigate, isLoggedIn, onLogout }: AdminDashboardPageProps) {
  const [currentView, setCurrentView] = useState<AdminView>("list");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmReasonError, setConfirmReasonError] = useState<string | null>(null);

  const openConfirmAction = (action: ConfirmAction) => {
    setConfirmReason("");
    setConfirmReasonError(null);
    setConfirmAction(action);
  };

  const employeeCountLabel = useMemo(() => employees.length, [employees.length]);

  const refreshEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const result = await adminAPI.listEmployees();
      if (result.status !== "success" || !result.data) {
        setFeedback({ type: "error", message: result.message || "Failed to load employees" });
        setEmployees([]);
        return;
      }

      const mapped: Employee[] = result.data.employees.map((emp) => ({
        id: emp.id,
        username: emp.username,
        email: emp.email,
        role: emp.role,
        status: emp.is_suspended ? "suspended" : "active",
        createdAt: emp.created_at ? String(emp.created_at).split("T")[0] : "",
      }));

      setEmployees(mapped);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    void refreshEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateEmployee = async () => {
    setFeedback(null);
    
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setFeedback({ type: "error", message: "All fields are required" });
      return;
    }

    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.valid) {
      setFeedback({ type: "error", message: usernameValidation.message });
      return;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setFeedback({ type: "error", message: emailValidation.message });
      return;
    }

    const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
    if (!passwordMatchValidation.valid) {
      setFeedback({ type: "error", message: passwordMatchValidation.message });
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setFeedback({ type: "error", message: passwordValidation.message });
      return;
    }

    const result = await adminAPI.createEmployee({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (result.status !== "success") {
      setFeedback({ type: "error", message: result.message || "Failed to create employee" });
      return;
    }

    setFeedback({ type: "success", message: `Employee ${formData.username} created successfully!` });
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
    setCurrentView("list");
    await refreshEmployees();
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    
    setFeedback(null);
    
    if (!formData.username || !formData.email) {
      setFeedback({ type: "error", message: "Username and email are required" });
      return;
    }

    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.valid) {
      setFeedback({ type: "error", message: usernameValidation.message });
      return;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setFeedback({ type: "error", message: emailValidation.message });
      return;
    }

    const payload: { email: string; username: string; password?: string; confirmPassword?: string } = {
      email: formData.email,
      username: formData.username,
    };

    if (formData.password || formData.confirmPassword) {
      const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
      if (!passwordMatchValidation.valid) {
        setFeedback({ type: "error", message: passwordMatchValidation.message });
        return;
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        setFeedback({ type: "error", message: passwordValidation.message });
        return;
      }

      payload.password = formData.password;
      payload.confirmPassword = formData.confirmPassword;
    }

    const result = await adminAPI.updateEmployee(selectedEmployee.id, payload);
    if (result.status !== "success") {
      setFeedback({ type: "error", message: result.message || "Failed to update employee" });
      return;
    }

    const passwordChanged = formData.password ? " (password updated)" : "";
    setFeedback({ type: "success", message: `Employee ${formData.username} updated successfully!${passwordChanged}` });
    setCurrentView("list");
    setSelectedEmployee(null);
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
    await refreshEmployees();
  };

  const handleSuspendEmployee = async (id: number) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    const newStatus: "active" | "suspended" = employee.status === "active" ? "suspended" : "active";
    const willSuspend = newStatus === "suspended";

    openConfirmAction({
      title: willSuspend ? "Suspend Employee" : "Reactivate Employee",
      message: willSuspend
        ? `Suspend employee ${employee.username}? The reason will be shown to the employee.`
        : `Reactivate employee ${employee.username}?`,
      requiresReason: willSuspend,
      reasonLabel: "Suspension reason (visible to the employee)",
      reasonPlaceholder: "Explain why this employee is being suspended...",
      onConfirm: (reason) => {
        void (async () => {
          const result = await adminAPI.setEmployeeSuspended(id, willSuspend, willSuspend ? reason : undefined);
          if (result.status !== "success") {
            setFeedback({ type: "error", message: result.message || "Failed to update employee status" });
            return;
          }

          setFeedback({ type: "success", message: `Employee ${employee.username} ${willSuspend ? "suspended" : "reactivated"}` });
          await refreshEmployees();
        })();
      },
    });
  };

  const handleDeleteEmployee = (id: number) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    openConfirmAction({
      title: "Delete Employee",
      message: `Are you sure you want to delete employee ${employee.username}?`,
      onConfirm: async () => {
        const result = await adminAPI.deleteEmployee(id);
        if (result.status !== "success") {
          setFeedback({ type: "error", message: result.message || "Failed to delete employee" });
          return;
        }
        setFeedback({ type: "success", message: `Employee ${employee.username} deleted successfully` });
        await refreshEmployees();
      },
    });
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

  const openEditForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      username: employee.username,
      email: employee.email,
      password: "",
      confirmPassword: "",
    });
    setCurrentView("edit");
    setFeedback(null);
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="admin" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="flex gap-6 h-full">
        {/* Control Panel */}
        <div className="w-64 border border-white/20 p-4 space-y-2 bg-[#121212]">
          <div className="border-b border-white/20 pb-3 text-lg mb-4 text-white font-['Cinzel'] tracking-wider">
            Admin Menu
          </div>
          <button 
            onClick={() => { setCurrentView("list"); setFeedback(null); }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "list" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/30 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Employee Accounts
          </button>
          <button 
            onClick={() => { 
              setCurrentView("create"); 
              setFormData({ username: "", email: "", password: "", confirmPassword: "" });
              setFeedback(null);
            }}
            className={`border p-3 text-sm w-full text-left transition-all ${
              currentView === "create" 
                ? "border-white/50 bg-white/10 text-white/90" 
                : "border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40"
            }`}
          >
            Create Employee
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

          {/* Employee List View */}
          {currentView === "list" && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                Employee Accounts ({employeeCountLabel})
              </h2>

              <div className="space-y-2">
                {isLoadingEmployees ? (
                  <div className="text-white/60 text-sm text-center py-8">Loading employees…</div>
                ) : employees.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-8">
                    No employees found. Create one to get started.
                  </div>
                ) : (
                  employees.map((employee) => (
                    <div key={employee.id} className="border border-white/20 p-4 flex items-center justify-between bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-white/30 transition-all duration-300">
                      <div className="flex gap-4 items-center">
                        <div className="border border-white/20 w-12 h-12 flex items-center justify-center text-xs bg-[#121212] text-white/40 rounded-full">
                          {employee.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-white/90">{employee.username}</div>
                          <div className="text-xs text-white/60">{employee.email}</div>
                          <div className="text-xs text-white/60">
                            Status: <span className={employee.status === "active" ? "text-green-400/90" : "text-yellow-400/90"}>
                              {employee.status}
                            </span> • Created: {employee.createdAt}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditForm(employee)}
                          className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleSuspendEmployee(employee.id)}
                          className={`border px-4 py-2 text-sm transition-all cursor-pointer ${
                            employee.status === "active"
                              ? "border-yellow-500/30 text-yellow-400/90 hover:bg-yellow-500/5 hover:border-yellow-500/50"
                              : "border-green-500/30 text-green-400/90 hover:bg-green-500/5 hover:border-green-500/50"
                          }`}
                        >
                          {employee.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="border border-red-500/30 px-4 py-2 text-sm text-red-400/90 hover:bg-red-500/5 hover:border-red-500/50 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Create Employee View */}
          {currentView === "create" && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                Create New Employee
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Username *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="employee_username"
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="employee@fantasyrealm.com"
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Password * (min. 6 characters)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreateEmployee}
                    className="border border-white/30 px-6 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                  >
                    Create Employee Account
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentView("list");
                      setFormData({ username: "", email: "", password: "", confirmPassword: "" });
                      setFeedback(null);
                    }}
                    className="border border-white/20 px-6 py-2 text-sm text-white/70 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Edit Employee View */}
          {currentView === "edit" && selectedEmployee && (
            <>
              <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
                Edit Employee: {selectedEmployee.username}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Username *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="border border-white/10 p-4 space-y-3">
                  <div className="text-sm text-white/80 font-['Cinzel']">Change Password (Optional)</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/70 mb-2">New Password (min. 6 characters)</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        className="w-full bg-[#0a0a0a] border border-white/30 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleEditEmployee}
                    className="border border-white/30 px-6 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentView("list");
                      setSelectedEmployee(null);
                      setFormData({ username: "", email: "", password: "", confirmPassword: "" });
                      setFeedback(null);
                    }}
                    className="border border-white/20 px-6 py-2 text-sm text-white/70 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
                  {confirmAction.reasonLabel || "Reason (visible to the employee)"}
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
    </WireframeLayout>
  );
}
