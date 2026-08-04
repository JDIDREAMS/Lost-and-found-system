import { Link } from "@tanstack/react-router";
import { Compass, PlusCircle, LayoutDashboard, LogOut, Shield, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

export function SiteHeader() {
  const { user, displayName, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
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

        <div className="ml-auto flex items-center gap-1">
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
            <Button size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
