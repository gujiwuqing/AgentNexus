import { z } from "zod";

export const teamMembersInputSchema = z.object({
  members: z.array(z.object({
    memberAgentId: z.string().min(1),
    roleDescription: z.string().optional(),
  })),
});

export type TeamMembersInput = z.infer<typeof teamMembersInputSchema>;
