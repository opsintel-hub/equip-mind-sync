import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const normalizeSearch = (s?: string) => (s || "").replace(/^\?/, "");

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onMouseEnter, onFocus, ...props }, ref) => {
    const location = useLocation();
    const rawTo = typeof to === "string" ? to : "";
    const path = typeof to === "string" ? to.split("?")[0] : (to as any)?.pathname;
    const linkSearch = typeof to === "string"
      ? normalizeSearch(rawTo.split("?")[1])
      : normalizeSearch((to as any)?.search);

    const handleEnter = useCallback((e: any) => {
      if (path) prefetchRoute(path);
      onMouseEnter?.(e);
    }, [path, onMouseEnter]);

    const handleFocus = useCallback((e: any) => {
      if (path) prefetchRoute(path);
      onFocus?.(e);
    }, [path, onFocus]);

    // When several links share a pathname but differ by query string,
    // only the one whose query matches the current URL should be active.
    const samePath = path === location.pathname;
    const searchMatches = linkSearch === normalizeSearch(location.search);

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleEnter}
        onFocus={handleFocus}
        className={({ isActive, isPending }) => {
          const active = samePath ? searchMatches : isActive && !linkSearch;
          return cn(className, active && activeClassName, isPending && pendingClassName);
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };

