import { Injectable } from "@angular/core";
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from "@angular/router";

import { normalizeRoute } from "../helpers/menu-permissions";
import { AuthenticationService } from "../services/auth.service";

/**
 * Single route-access guard.
 *
 * It authenticates the session and authorizes the navigation against the
 * server-signed menu. Routes do not declare their own permission: the required
 * route is resolved from the URL with the longest menu-route match, so child
 * and parameterized pages inherit their module's permission.
 */
@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate, CanActivateChild {
  /** Pages available to any authenticated user because they are not modules. */
  private static readonly AUTHENTICATED_ONLY = ["/profile", "/pages"];

  /** Legacy menu routes still accepted for a module. */
  private static readonly ROUTE_ALIASES: Record<string, string[]> = {
    "/reservations/borderoux": ["/reservations/schools"]
  };

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (!this.authenticationService.currentUser()) {
      this.authenticationService.logout();
      return false;
    }

    const url = normalizeRoute(state.url);
    if (!url || url === "/") {
      return this.router.parseUrl(this.authenticationService.getDashboardRoute());
    }

    if (this.canAccess(url)) {
      return true;
    }

    const dashboard = normalizeRoute(this.authenticationService.getDashboardRoute());
    return dashboard === url ? false : this.router.parseUrl(dashboard);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    return this.canActivate(childRoute, state);
  }

  private canAccess(url: string): boolean {
    if (AuthGuard.AUTHENTICATED_ONLY.some(prefix => url === prefix || url.startsWith(`${prefix}/`))) {
      return true;
    }
    if (this.authenticationService.canAccessRoute(url)) {
      return true;
    }
    return (AuthGuard.ROUTE_ALIASES[url] || [])
      .some(alias => this.authenticationService.canAccessRoute(alias));
  }
}
