import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://trustay.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/city/"],
      disallow: ["/api/", "/checkout/", "/admin"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
