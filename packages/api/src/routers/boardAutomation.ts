import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as automationRepo from "@kan/db/repository/boardAutomation.repo";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { automationActionTypes, automationTriggerTypes } from "@kan/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const automationTriggerTypeSchema = z.enum(automationTriggerTypes);
const automationActionTypeSchema = z.enum(automationActionTypes);

export const boardAutomationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ boardPublicId: z.string().min(12) }))
    .output(
      z.array(
        z.object({
          publicId: z.string(),
          name: z.string(),
          triggerType: automationTriggerTypeSchema,
          actionType: automationActionTypeSchema,
          triggerList: z.object({ publicId: z.string(), name: z.string() }),
          actionLabel: z
            .object({
              publicId: z.string(),
              name: z.string(),
              colourCode: z.string().nullable(),
            })
            .nullable(),
          actionMember: z
            .object({
              publicId: z.string(),
              name: z.string().nullable(),
            })
            .nullable(),
          active: z.boolean(),
          createdAt: z.date(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });

      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      const rules = await automationRepo.getAllByBoardId(ctx.db, board.id);

      return rules.map((rule) => ({
        publicId: rule.publicId,
        name: rule.name,
        triggerType: rule.triggerType,
        actionType: rule.actionType,
        triggerList: rule.triggerList,
        actionLabel: rule.actionLabel,
        actionMember: rule.actionMember
          ? {
              publicId: rule.actionMember.publicId,
              name: rule.actionMember.user?.name ?? null,
            }
          : null,
        active: rule.active,
        createdAt: rule.createdAt,
      }));
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          boardPublicId: z.string().min(12),
          name: z.string().min(1).max(255),
          triggerListPublicId: z.string().min(12),
          actionType: automationActionTypeSchema,
          actionLabelPublicId: z.string().min(12).optional(),
          actionMemberPublicId: z.string().min(12).optional(),
        })
        .refine(
          (v) =>
            v.actionType === "card.add_label"
              ? !!v.actionLabelPublicId
              : !!v.actionMemberPublicId,
          {
            message:
              "actionLabelPublicId or actionMemberPublicId is required for the chosen actionType",
          },
        ),
    )
    .output(z.object({ publicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });

      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      const triggerList = await listRepo.getByPublicId(
        ctx.db,
        input.triggerListPublicId,
      );
      if (!triggerList || triggerList.boardId !== board.id)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trigger list not found on this board",
        });

      let actionLabelId: number | undefined;
      let actionWorkspaceMemberId: number | undefined;

      if (input.actionType === "card.add_label") {
        const label = await labelRepo.getByPublicId(
          ctx.db,
          input.actionLabelPublicId!,
        );
        if (!label || label.boardId !== board.id)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Label not found on this board",
          });
        actionLabelId = label.id;
      } else {
        const member = await workspaceRepo.getMemberByPublicId(
          ctx.db,
          input.actionMemberPublicId!,
        );
        if (!member || member.workspaceId !== board.workspaceId)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found in this workspace",
          });
        actionWorkspaceMemberId = member.id;
      }

      const result = await automationRepo.create(ctx.db, {
        boardId: board.id,
        name: input.name,
        triggerType: "card.moved_to_list",
        triggerListId: triggerList.id,
        actionType: input.actionType,
        actionLabelId,
        actionWorkspaceMemberId,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create automation",
        });

      return result;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        automationPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });

      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      const rule = await automationRepo.getByPublicId(
        ctx.db,
        input.automationPublicId,
      );
      if (!rule || rule.boardId !== board.id)
        throw new TRPCError({ code: "NOT_FOUND", message: "Automation not found" });

      await automationRepo.hardDelete(ctx.db, input.automationPublicId);

      return { success: true };
    }),
});
