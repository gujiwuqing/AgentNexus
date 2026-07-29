"use client";

import { useQuery } from "@tanstack/react-query";
import type { SafeUser } from "@/server/users";

export function useAuthMe() {
  const { data } = useQuery<SafeUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      return res.json();
    },
    staleTime: 30_000,
  });
  return { me: data ?? undefined };
}
