export type AppRole = "client" | "trainer" | "admin";

/** The single source of truth for where each role lands after login. */
export function homeForRole(role: AppRole | null): string {
  switch (role) {
    case "trainer":
      return "/trainer";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}
