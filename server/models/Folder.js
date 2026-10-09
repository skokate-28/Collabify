const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doc',
      },
    ],
  },
  { timestamps: true }
);

folderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Folder', folderSchema);
