"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "text" | "both";
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({ 
  className, 
  variant = "icon",
  size = "md" 
}: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>("system");
  const [mounted, setMounted] = React.useState(false);

  // Effect to get initial theme
  React.useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to system preference
      setTheme("system");
      applyTheme("system");
    }
  }, []);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Remove existing theme classes
    root.classList.remove("light-theme", "dark-theme");
    
    // Apply new theme
    if (newTheme === "system") {
      root.classList.add(prefersDark ? "dark-theme" : "light-theme");
    } else {
      root.classList.add(`${newTheme}-theme`);
    }
    
    // Add transition class for smooth theme change
    root.classList.add("theme-transition");
    
    // Store preference
    localStorage.setItem("theme", newTheme);
  };

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Listen for system theme changes
  React.useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Don't render until mounted (avoids hydration mismatch)
  if (!mounted) {
    return (
      <div className={cn(
        "h-9 w-9 animate-pulse bg-gray-200 rounded-md",
        size === "sm" && "h-8 w-8",
        size === "lg" && "h-10 w-10",
        className
      )} />
    );
  }

  const getCurrentIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-4 w-4" />;
    }
    return theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10"
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative transition-colors",
            sizeClasses[size],
            className
          )}
          aria-label="Toggle theme"
        >
          {getCurrentIcon()}
          {variant === "text" && (
            <span className="ml-2">Theme</span>
          )}
          {variant === "both" && (
            <span className="sr-only">Toggle theme</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center">
            <Sun className="mr-2 h-4 w-4" />
            Light
          </span>
          {theme === "light" && (
            <span className="text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center">
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </span>
          {theme === "dark" && (
            <span className="text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center">
            <Monitor className="mr-2 h-4 w-4" />
            System
          </span>
          {theme === "system" && (
            <span className="text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for accessing theme in components
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Resolve actual theme
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "system" || !savedTheme) {
      setResolvedTheme(prefersDark ? "dark" : "light");
    } else {
      setResolvedTheme(savedTheme as "light" | "dark");
    }
  }, []);

  return { theme, resolvedTheme };
}