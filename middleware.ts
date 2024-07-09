import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/api/webhooks/clerk", "/api/webhooks/paypal"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/(api|trpc)(.*)"],
};
