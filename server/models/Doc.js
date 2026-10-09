const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const docSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Document',
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

docSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Doc', docSchema);
