// =============================================================================
// ShipFlow AI — AI Conversation Memory Manager
// =============================================================================

import { prisma } from "@shipflow/db";
import { AgentType } from "@prisma/client";
import { logger } from "@shipflow/logger";

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: Date;
}

export class ConversationMemory {
  /**
   * Retrieves or creates an AIConversation for a given feature and agent type.
   */
  static async getOrCreateConversation(
    workspaceId: string,
    featureId: string,
    agentType: AgentType,
    title?: string
  ): Promise<string> {
    try {
      // Look for an existing conversation first
      const existing = await prisma.aIConversation.findFirst({
        where: {
          workspaceId,
          featureId,
          agentType,
        },
        select: { id: true },
      });

      if (existing) {
        return existing.id;
      }

      // Create new one if not found
      const created = await prisma.aIConversation.create({
        data: {
          workspaceId,
          featureId,
          agentType,
          title: title ?? `${agentType} conversation for Feature ${featureId}`,
        },
      });

      logger.info(`[Memory] Created new AIConversation thread: ${created.id}`);
      return created.id;
    } catch (error) {
      logger.error(`[Memory] Failed to get or create conversation thread:`, error);
      throw error;
    }
  }

  /**
   * Appends a message to the conversation thread.
   */
  static async appendMessage(
    conversationId: string,
    role: "system" | "user" | "assistant" | "tool",
    content: string,
    tokenCount?: number
  ): Promise<ChatMessage> {
    try {
      const message = await prisma.aIConversationMessage.create({
        data: {
          conversationId,
          role,
          content,
          tokenCount,
        },
      });

      logger.info(`[Memory] Appended message (role: ${role}) to conversation: ${conversationId}`);
      return {
        id: message.id,
        role: message.role as any,
        content: message.content,
        createdAt: message.createdAt,
      };
    } catch (error) {
      logger.error(`[Memory] Failed to append message to conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Loads all messages in the conversation thread sorted by creation date.
   */
  static async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const messages = await prisma.aIConversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });

      return messages.map((m) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      logger.error(`[Memory] Failed to load messages for conversation ${conversationId}:`, error);
      throw error;
    }
  }
}
