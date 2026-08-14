import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Compass,
  PlusCircle,
  LayoutDashboard,
  LogOut,
  Shield,
  Search,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SiteHeader() {
  const { user, displayName, isAdmin, signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/85 backdrop-blur">
      <div className="fluid-container flex h-16 items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-sm bg-foreground text-background">
            <Search className="size-4" />
          </span>
          FoundIt
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/browse">
              <Compass className="size-4" /> Browse
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/post">
              <PlusCircle className="size-4" /> Post an item
            </Link>
          </Button>
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <Shield className="size-4" /> Admin
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="size-9 rounded-full"
          >
            {isDark ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-slate-700" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <NotificationBell />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="rounded-full">
                  {(displayName || "Member").slice(0, 18)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="size-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/post">
                    <PlusCircle className="size-4" /> Post an item
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          {/* Mobile Navigation Drawer Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-md md:hidden"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-xs p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <SheetHeader className="text-left pb-4 border-b">
                  <SheetTitle className="flex items-center gap-2 font-display text-lg font-bold">
                    <span className="flex size-7 items-center justify-center rounded-sm bg-foreground text-background">
                      <Search className="size-3.5" />
                    </span>
                    FoundIt
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col space-y-1">
                  <Button variant="ghost" className="justify-start gap-3 h-11 text-base" asChild>
                    <Link to="/browse">
                      <Compass className="size-5" /> Browse Board
                    </Link>
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 text-base" asChild>
                    <Link to="/post">
                      <PlusCircle className="size-5" /> Post an Item
                    </Link>
                  </Button>
                  {user && (
                    <Button variant="ghost" className="justify-start gap-3 h-11 text-base" asChild>
                      <Link to="/dashboard">
                        <LayoutDashboard className="size-5" /> Dashboard
                      </Link>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" className="justify-start gap-3 h-11 text-base" asChild>
                      <Link to="/admin">
                        <Shield className="size-5" /> Admin
                      </Link>
                    </Button>
                  )}
                </nav>
              </div>

              <div className="pt-6 border-t space-y-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground truncate font-medium">
                      Signed in as: <span className="text-foreground">{user.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => void signOut()}
                    >
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full h-11" asChild>
                    <Link to="/auth">Sign in / Create Account</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="fluid-container flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>FoundIt — the campus lost &amp; found board for students and staff.</p>
        <nav className="flex gap-4">
          <Link to="/browse" className="hover:text-foreground">
            Browse items
          </Link>
          <Link to="/post" className="hover:text-foreground">
            Report an item
          </Link>
        </nav>
      </div>
    </footer>
  );
}
