// Theme Implementation Examples
// These examples show how to update existing components to support both light and dark themes

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeToggle";

// Example 1: Card Component with Theme Support
export function ThemedCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // Base styles that work for both themes
        "rounded-lg border p-6 transition-all duration-200",
        // Theme-aware classes
        "bg-white dark:bg-gray-800",
        "border-gray-200 dark:border-gray-700",
        "text-gray-900 dark:text-gray-100",
        "hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-900/20",
        className
      )}
    >
      {children}
    </div>
  );
}

// Example 2: Navigation Bar with Theme Toggle
export function ThemedNavbar() {
  return (
    <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md 
                    border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              LiveGuide
            </span>
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            <a href="/lobby" 
               className="text-gray-600 dark:text-gray-300 hover:text-gray-900 
                          dark:hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/agents" 
               className="text-gray-600 dark:text-gray-300 hover:text-gray-900 
                          dark:hover:text-white transition-colors">
              Agents
            </a>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

// Example 3: Button with Theme-Aware Variants
export function ThemedButton({ 
  variant = "primary",
  children,
  className,
  ...props
}: {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      className={cn(
        // Base button styles
        "px-4 py-2 rounded-md font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        
        // Variant styles with theme support
        variant === "primary" && [
          "bg-gradient-to-r from-blue-600 to-purple-600",
          "text-white",
          "hover:from-blue-700 hover:to-purple-700",
          "focus:ring-blue-500"
        ],
        
        variant === "secondary" && [
          "bg-gray-100 dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          "border border-gray-300 dark:border-gray-600",
          "hover:bg-gray-200 dark:hover:bg-gray-700",
          "focus:ring-gray-500"
        ],
        
        variant === "ghost" && [
          "bg-transparent",
          "text-gray-600 dark:text-gray-400",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "hover:text-gray-900 dark:hover:text-gray-100"
        ],
        
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Example 4: Form Input with Theme Support
export function ThemedInput({
  label,
  error,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 rounded-md transition-colors",
          "bg-white dark:bg-gray-800",
          "border border-gray-300 dark:border-gray-600",
          "text-gray-900 dark:text-gray-100",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus:border-blue-500 dark:focus:border-blue-400",
          "focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
          "focus:outline-none",
          error && "border-red-500 dark:border-red-400",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// Example 5: Agent Card with Theme and Feminine Theme Support
export function ThemedAgentCard({ 
  agent,
  feminineTheme = "rose-quartz"
}: {
  agent: any;
  feminineTheme?: "rose-quartz" | "lavender" | "peachy" | "mauve";
}) {
  const { resolvedTheme } = useTheme();
  
  return (
    <div
      className={cn(
        // Base card styles
        "relative overflow-hidden rounded-xl border-2 p-6",
        "transition-all duration-300 hover:scale-105",
        
        // Light theme styles
        resolvedTheme === "light" && [
          "bg-white",
          "hover:shadow-lg",
          feminineTheme === "rose-quartz" && "border-rose-200 hover:border-rose-300",
          feminineTheme === "lavender" && "border-purple-200 hover:border-purple-300",
          feminineTheme === "peachy" && "border-orange-200 hover:border-orange-300",
          feminineTheme === "mauve" && "border-purple-300 hover:border-purple-400"
        ],
        
        // Dark theme styles
        resolvedTheme === "dark" && [
          "bg-gray-800",
          "hover:shadow-2xl hover:shadow-gray-900/50",
          feminineTheme === "rose-quartz" && "border-rose-600/30 hover:border-rose-500/50",
          feminineTheme === "lavender" && "border-purple-600/30 hover:border-purple-500/50",
          feminineTheme === "peachy" && "border-orange-600/30 hover:border-orange-500/50",
          feminineTheme === "mauve" && "border-purple-700/30 hover:border-purple-600/50"
        ]
      )}
    >
      {/* Gradient overlay for feminine theme */}
      <div
        className={cn(
          "absolute inset-0 opacity-5",
          feminineTheme === "rose-quartz" && "bg-gradient-to-br from-rose-400 to-pink-400",
          feminineTheme === "lavender" && "bg-gradient-to-br from-purple-400 to-indigo-400",
          feminineTheme === "peachy" && "bg-gradient-to-br from-orange-400 to-red-400",
          feminineTheme === "mauve" && "bg-gradient-to-br from-purple-500 to-pink-500"
        )}
      />
      
      {/* Card content */}
      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {agent.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {agent.specialty}
        </p>
      </div>
    </div>
  );
}

// Example 6: Stats Dashboard with Theme Support
export function ThemedStatsDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Stat Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border 
                      border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Sessions
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              1,234
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" 
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 dark:text-green-400 font-medium">
            +12%
          </span>
          <span className="text-gray-600 dark:text-gray-400 ml-2">
            from last month
          </span>
        </div>
      </div>
    </div>
  );
}

// Example 7: Modal with Theme Support
export function ThemedModal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg 
                        bg-white dark:bg-gray-800 shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 text-gray-700 dark:text-gray-300">
            {children}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 flex justify-end space-x-3">
            <ThemedButton variant="ghost" onClick={onClose}>
              Cancel
            </ThemedButton>
            <ThemedButton variant="primary">
              Confirm
            </ThemedButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example 8: CSS Variables Usage
export const themeVariablesExample = `
/* In your CSS file */
.themed-component {
  /* Using CSS variables that change with theme */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-primary);
  
  /* Hover state using variables */
  &:hover {
    background-color: var(--bg-hover);
    box-shadow: var(--shadow-md);
  }
  
  /* Focus state */
  &:focus {
    outline: 2px solid var(--accent-primary-start);
    outline-offset: 2px;
  }
}

/* Gradient using theme variables */
.themed-gradient {
  background: linear-gradient(
    135deg,
    var(--accent-primary-start),
    var(--accent-primary-end)
  );
}
`;