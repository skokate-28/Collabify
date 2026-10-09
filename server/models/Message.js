const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    resourceLink: {
      type: {
        type: String,
        enum: ['task', 'board', 'doc', 'folder', null],
        default: null,
      },
      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      title: {
        type: String,
        default: '',
      },
      url: {
        type: String,
        default: '',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Message', messageSchema);
