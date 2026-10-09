const Folder = require('../models/Folder');
const Doc = require('../models/Doc');
const Workspace = require('../models/Workspace');
const apiResponse = require('../utils/apiResponse');

const collectDescendantIds = async (folderId) => {
  const folder = await Folder.findById(folderId);
  if (!folder) return [];
  const ids = [];
  for (const childId of folder.children || []) {
    ids.push(childId.toString());
    const nested = await collectDescendantIds(childId);
    ids.push(...nested);
  }
  return ids;
};

const deleteFolderRecursive = async (folderId) => {
  const folder = await Folder.findById(folderId);
  if (!folder) return;

  for (const childId of folder.children || []) {
    await deleteFolderRecursive(childId);
  }

  await Doc.deleteMany({ folder: folderId });
  await Folder.findByIdAndDelete(folderId);
};

const buildFolderNode = async (folder) => {
  const childrenDocs = await Folder.find({ parent: folder._id }).sort({ name: 1 });
  const documents = await Doc.find({ folder: folder._id })
    .populate('lastEditedBy', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ updatedAt: -1 });

  const children = [];
  for (const child of childrenDocs) {
    children.push(await buildFolderNode(child));
  }

  return {
    ...folder.toObject(),
    children,
    documents,
  };
};

const createFolder = async (req, res) => {
  try {
    const { name, workspaceId, parentId } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return apiResponse.error(res, 'Folder name is required', 400);
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    let parent = null;
    if (parentId) {
      parent = await Folder.findById(parentId);
      if (!parent || parent.workspace.toString() !== workspaceId.toString()) {
        return apiResponse.error(res, 'Parent folder not found', 404);
      }
    }

    const folder = await Folder.create({
      name: name.trim(),
      workspace: workspaceId,
      parent: parentId || null,
      createdBy: userId,
      children: [],
      documents: [],
    });

    if (parent) {
      parent.children.push(folder._id);
      await parent.save();
    }

    return apiResponse.success(res, folder, 'Folder created successfully', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceFolderTree = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const rootFolders = await Folder.find({ workspace: workspaceId, parent: null }).sort({ name: 1 });

    const tree = [];
    for (const folder of rootFolders) {
      tree.push(await buildFolderNode(folder));
    }

    const rootDocuments = await Doc.find({ workspace: workspaceId, folder: null })
      .populate('lastEditedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ updatedAt: -1 });

    return apiResponse.success(res, { tree, rootDocuments }, 'Folder tree fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getFolderContents = async (req, res) => {
  try {
    const { folderId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const isRoot = folderId === 'root';
    const workspaceId = req.query.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return apiResponse.error(res, 'Workspace ID is required', 400);
    }

    const parentQuery = isRoot ? null : folderId;
    const folders = await Folder.find({
      workspace: workspaceId,
      parent: parentQuery,
    }).sort({ name: 1 });

    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const subfolderCount = await Folder.countDocuments({ parent: folder._id });
        const documentCount = await Doc.countDocuments({ folder: folder._id });
        return {
          ...folder.toObject(),
          subfolderCount,
          documentCount,
        };
      })
    );

    const docsResult = await Doc.paginate(
      { workspace: workspaceId, folder: parentQuery },
      {
        page,
        limit,
        sort: { updatedAt: -1 },
        populate: [
          { path: 'lastEditedBy', select: 'name email avatar' },
          { path: 'createdBy', select: 'name email avatar' },
        ],
      }
    );

    let folder = null;
    if (!isRoot) {
      folder = await Folder.findById(folderId);
    }

    return apiResponse.success(
      res,
      {
        folder,
        folders: foldersWithCounts,
        documents: docsResult.docs,
        pagination: {
          page: docsResult.page,
          limit: docsResult.limit,
          totalDocs: docsResult.totalDocs,
          totalPages: docsResult.totalPages,
          hasNextPage: docsResult.hasNextPage,
        },
      },
      'Folder contents fetched successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const renameFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return apiResponse.error(res, 'Folder name is required', 400);
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return apiResponse.error(res, 'Folder not found', 404);
    }

    folder.name = name.trim();
    await folder.save();

    return apiResponse.success(res, folder, 'Folder renamed successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const moveFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newParentId } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return apiResponse.error(res, 'Folder not found', 404);
    }

    const destId = newParentId || null;

    if (destId && destId.toString() === folderId.toString()) {
      return apiResponse.error(res, 'Cannot move a folder into itself', 400);
    }

    if (destId) {
      const descendants = await collectDescendantIds(folderId);
      if (descendants.includes(destId.toString())) {
        return apiResponse.error(res, 'Cannot move a folder into its own descendant', 400);
      }

      const newParent = await Folder.findById(destId);
      if (!newParent || newParent.workspace.toString() !== folder.workspace.toString()) {
        return apiResponse.error(res, 'Destination folder not found', 404);
      }
    }

    const oldParentId = folder.parent;

    if (oldParentId) {
      await Folder.findByIdAndUpdate(oldParentId, { $pull: { children: folder._id } });
    }

    folder.parent = destId;
    await folder.save();

    if (destId) {
      await Folder.findByIdAndUpdate(destId, { $addToSet: { children: folder._id } });
    }

    return apiResponse.success(res, folder, 'Folder moved successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return apiResponse.error(res, 'Folder not found', 404);
    }

    if (folder.parent) {
      await Folder.findByIdAndUpdate(folder.parent, { $pull: { children: folder._id } });
    }

    await deleteFolderRecursive(folderId);

    return apiResponse.success(res, null, 'Folder deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  createFolder,
  getWorkspaceFolderTree,
  getFolderContents,
  renameFolder,
  moveFolder,
  deleteFolder,
};
