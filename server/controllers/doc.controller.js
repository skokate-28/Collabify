const Doc = require('../models/Doc');
const Folder = require('../models/Folder');
const Workspace = require('../models/Workspace');
const apiResponse = require('../utils/apiResponse');

const createDoc = async (req, res) => {
  try {
    const { workspaceId, title, folderId } = req.body;
    const userId = req.user.userId;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    let folder = null;
    if (folderId) {
      folder = await Folder.findById(folderId);
      if (!folder || folder.workspace.toString() !== workspaceId.toString()) {
        return apiResponse.error(res, 'Folder not found', 404);
      }
    }

    const doc = await Doc.create({
      title: title || 'Untitled Document',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      workspace: workspaceId,
      folder: folderId || null,
      createdBy: userId,
      lastEditedBy: userId,
      collaborators: [userId],
    });

    if (folder) {
      folder.documents.push(doc._id);
      await folder.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${workspaceId}`).emit('doc:update', doc);
    }

    return apiResponse.success(res, doc, 'Document created successfully', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceDocs = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const folderId = req.query.folderId;

    const filter = { workspace: workspaceId };
    if (folderId === 'root' || folderId === 'null') {
      filter.folder = null;
    } else if (folderId) {
      filter.folder = folderId;
    }

    const result = await Doc.paginate(filter, {
      page,
      limit,
      sort: { updatedAt: -1 },
      populate: [
        { path: 'lastEditedBy', select: 'name email avatar' },
        { path: 'createdBy', select: 'name email avatar' },
      ],
    });

    return apiResponse.success(
      res,
      {
        docs: result.docs,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
        },
      },
      'Docs fetched successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getDocById = async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await Doc.findById(docId)
      .populate('createdBy', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .populate('collaborators', 'name email avatar');

    if (!doc) {
      return apiResponse.error(res, 'Document not found', 404);
    }

    return apiResponse.success(res, doc, 'Doc details fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateDoc = async (req, res) => {
  try {
    const { docId } = req.params;
    const { title, content, isPublic } = req.body;
    const userId = req.user.userId;

    const doc = await Doc.findById(docId);
    if (!doc) {
      return apiResponse.error(res, 'Document not found', 404);
    }

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    if (isPublic !== undefined) doc.isPublic = isPublic;

    doc.lastEditedBy = userId;
    if (!doc.collaborators.includes(userId)) {
      doc.collaborators.push(userId);
    }

    await doc.save();

    const populatedDoc = await Doc.findById(docId)
      .populate('createdBy', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .populate('collaborators', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`doc:${docId}`).emit('doc:update', populatedDoc);
    }

    return apiResponse.success(res, populatedDoc, 'Doc updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const moveDoc = async (req, res) => {
  try {
    const { docId } = req.params;
    const { newFolderId } = req.body;

    const doc = await Doc.findById(docId);
    if (!doc) {
      return apiResponse.error(res, 'Document not found', 404);
    }

    const destId = newFolderId || null;

    if (destId) {
      const destFolder = await Folder.findById(destId);
      if (!destFolder || destFolder.workspace.toString() !== doc.workspace.toString()) {
        return apiResponse.error(res, 'Destination folder not found', 404);
      }
    }

    if (doc.folder) {
      await Folder.findByIdAndUpdate(doc.folder, { $pull: { documents: doc._id } });
    }

    doc.folder = destId;
    await doc.save();

    if (destId) {
      await Folder.findByIdAndUpdate(destId, { $addToSet: { documents: doc._id } });
    }

    return apiResponse.success(res, doc, 'Document moved successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteDoc = async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await Doc.findById(docId);
    if (!doc) {
      return apiResponse.error(res, 'Document not found', 404);
    }

    if (doc.folder) {
      await Folder.findByIdAndUpdate(doc.folder, { $pull: { documents: docId } });
    }

    await Doc.findByIdAndDelete(docId);

    return apiResponse.success(res, null, 'Document deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  createDoc,
  getWorkspaceDocs,
  getDocById,
  updateDoc,
  moveDoc,
  deleteDoc,
};
