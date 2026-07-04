import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as inboxRepo from "@kan/db/repository/inboxItem.repo";
import * as listRepo from "@kan/db/repository/list.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

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

  convertToCard: protectedProcedure
    .input(
      z.object({
        publicId: z.string().min(12),
        listPublicId: z.string().min(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);

      const item = await inboxRepo.getByPublicId(ctx.db, input.publicId);
      if (!item || item.userId !== userId)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inbox item not found",
        });

      const list = await listRepo.getWorkspaceAndListIdByListPublicId(
        ctx.db,
        input.listPublicId,
      );
      if (!list)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `List with public ID ${input.listPublicId} not found`,
        });

      await assertPermission(ctx.db, userId, list.workspaceId, "card:create");

      const card = await cardRepo.create(ctx.db, {
        title: item.title,
        description: item.description ?? "",
        createdBy: userId,
        listId: list.id,
        workspaceId: list.workspaceId,
        position: "end",
        dueDate: item.dueDate ?? null,
      });

      const existingMeta = item.sourceMeta
        ? (JSON.parse(item.sourceMeta) as Record<string, unknown>)
        : {};
      await inboxRepo.softDelete(ctx.db, {
        publicId: input.publicId,
        userId,
        sourceMeta: JSON.stringify({
          ...existingMeta,
          convertedToCardPublicId: card.publicId,
        }),
      });

      return { cardPublicId: card.publicId, boardPublicId: list.boardPublicId };
    }),
});
