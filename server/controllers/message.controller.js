const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const apiResponse = require('../utils/apiResponse');

const sortParticipantIds = (a, b) => [a.toString(), b.toString()].sort();

const getOrCreateConversation = async (req, res) => {
  try {
    const { workspaceId, recipientId } = req.body;
    const userId = req.user.userId;

    if (!recipientId) {
      return apiResponse.error(res, 'Recipient is required', 400);
    }

    if (recipientId.toString() === userId.toString()) {
      return apiResponse.error(res, 'Cannot start a conversation with yourself', 400);
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    const isRecipientMember = workspace.members.some(
      (m) => m.user.toString() === recipientId.toString()
    );
    if (!isRecipientMember) {
      return apiResponse.error(res, 'Recipient is not a member of this workspace', 400);
    }

    const participants = sortParticipantIds(userId, recipientId);

    let conversation = await Conversation.findOne({
      workspace: workspaceId,
      participants: { $all: participants, $size: 2 },
    })
      .populate('participants', 'name email avatar')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        workspace: workspaceId,
        participants,
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email avatar')
        .populate('lastMessage');
    }

    return apiResponse.success(res, conversation, 'Conversation ready');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      workspace: workspaceId,
      participants: userId,
    })
      .populate('participants', 'name email avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name email avatar' },
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false,
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    const unreadTotal = withUnread.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    return apiResponse.success(
      res,
      { conversations: withUnread, unreadTotal },
      'Conversations fetched successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return apiResponse.error(res, 'Conversation not found', 404);
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return apiResponse.error(res, 'Forbidden', 403);
    }

    const result = await Message.paginate(
      { conversation: conversationId },
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: { path: 'sender', select: 'name email avatar' },
      }
    );

    return apiResponse.success(
      res,
      {
        messages: result.docs,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
        },
      },
      'Messages fetched successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, resourceLink } = req.body;
    const userId = req.user.userId;

    if (!content || !content.trim()) {
      return apiResponse.error(res, 'Message content is required', 400);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return apiResponse.error(res, 'Conversation not found', 404);
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return apiResponse.error(res, 'Forbidden', 403);
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      content: content.trim(),
      resourceLink: resourceLink
        ? {
            type: resourceLink.type || null,
            resourceId: resourceLink.resourceId || null,
            title: resourceLink.title || '',
            url: resourceLink.url || '',
          }
        : undefined,
      isRead: false,
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      'sender',
      'name email avatar'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('dm:message', { message: populated });

      const recipientId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('dm:notification', {
          conversationId,
          senderName: populated.sender?.name,
          preview: populated.content.slice(0, 80),
          workspaceId: conversation.workspace,
        });
      }
    }

    return apiResponse.success(res, populated, 'Message sent', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return apiResponse.error(res, 'Conversation not found', 404);
    }

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true } }
    );

    return apiResponse.success(res, null, 'Conversation marked as read');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  getOrCreateConversation,
  getWorkspaceConversations,
  getMessages,
  sendMessage,
  markConversationRead,
};
