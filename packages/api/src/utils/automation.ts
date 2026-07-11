import * as automationRepo from "@kan/db/repository/boardAutomation.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import type { dbClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

const log = createLogger("automation");

/**
 * v1 only supports "card moved to list X" as a trigger, and neither of its
 * two action types changes a card's list — so a rule can never re-trigger
 * this function for the same card. Do not add a "move card" action type
 * without also adding a loop-guard (e.g. a max-depth counter), or two rules
 * watching each other's target lists will recurse indefinitely.
 */
export async function runAutomationsForCardMovedToList(
  db: dbClient,
  args: {
    boardId: number;
    toListId: number;
    cardId: number;
  },
): Promise<void> {
  try {
    const rules = await automationRepo.getActiveByBoardAndTriggerListId(
      db,
      args.boardId,
      args.toListId,
    );

    for (const rule of rules) {
      try {
        if (rule.actionType === "card.add_label" && rule.actionLabelId) {
          const existing = await cardRepo.getCardLabelRelationship(db, {
            cardId: args.cardId,
            labelId: rule.actionLabelId,
          });
          if (!existing) {
            await cardRepo.createCardLabelRelationship(db, {
              cardId: args.cardId,
              labelId: rule.actionLabelId,
            });
            await cardActivityRepo.create(db, {
              type: "card.updated.label.added",
              cardId: args.cardId,
              labelId: rule.actionLabelId,
              createdBy: rule.createdBy,
            });
          }
        } else if (
          rule.actionType === "card.assign_member" &&
          rule.actionWorkspaceMemberId
        ) {
          const existing = await cardRepo.getCardMemberRelationship(db, {
            cardId: args.cardId,
            memberId: rule.actionWorkspaceMemberId,
          });
          if (!existing) {
            await cardRepo.createCardMemberRelationship(db, {
              cardId: args.cardId,
              memberId: rule.actionWorkspaceMemberId,
            });
            await cardActivityRepo.create(db, {
              type: "card.updated.member.added",
              cardId: args.cardId,
              workspaceMemberId: rule.actionWorkspaceMemberId,
              createdBy: rule.createdBy,
            });
          }
        }
      } catch (err) {
        log.error({ err, ruleId: rule.publicId }, "Automation action failed");
      }
    }
  } catch (err) {
    log.error(
      { err, boardId: args.boardId, toListId: args.toListId },
      "Failed to run automations for board",
    );
  }
}
