import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as inboxRepo from "@kan/db/repository/inboxItem.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const requireUser = (userId: string | undefined): string => {
  if (!userId)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not authenticated",
    });
  return userId;
};

export const inboxRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = requireUser(ctx.user?.id);
    return inboxRepo.getAllByUser(ctx.db, userId);
  }),

  add: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(512),
        description: z.string().max(20000).nullish(),
        dueDate: z.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const result = await inboxRepo.create(ctx.db, {
        userId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        source: "manual",
      });
      if (!result)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create inbox item",
        });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        publicId: z.string().min(12),
        title: z.string().trim().min(1).max(512).optional(),
        description: z.string().max(20000).nullish(),
        dueDate: z.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const result = await inboxRepo.update(ctx.db, {
        publicId: input.publicId,
        userId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
      });
      if (!result)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inbox item not found",
        });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const result = await inboxRepo.softDelete(ctx.db, {
        publicId: input.publicId,
        userId,
      });
      if (!result)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inbox item not found",
        });
      return result;
    }),
});
