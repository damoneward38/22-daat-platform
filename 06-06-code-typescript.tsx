import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/#features",
    "/#pricing",
  ],
  ignoredRoutes: [
    "/api/webhook(.*)",
    "/api/health",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$)|/(api|trpc))(.*)", "/"],
};