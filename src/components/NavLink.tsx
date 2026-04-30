import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onMouseEnter, onFocus, ...props }, ref) => {
    const path = typeof to === "string" ? to : (to as any)?.pathname;

    const handleEnter = useCallback((e: any) => {
      if (path) prefetchRoute(path);
      onMouseEnter?.(e);
    }, [path, onMouseEnter]);

    const handleFocus = useCallback((e: any) => {
      if (path) prefetchRoute(path);
      onFocus?.(e);
    }, [path, onFocus]);

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleEnter}
        onFocus={handleFocus}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
