const Task = require('../models/Task');
const Notification = require('../models/Notification');

const runReminderJob = async (io) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const tasksDueTomorrow = await Task.find({
      dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
    });

    console.log(`[Job] Running reminder job. Found ${tasksDueTomorrow.length} tasks due tomorrow.`);

    for (const task of tasksDueTomorrow) {
      for (const assigneeId of task.assignees) {
        const notif = await Notification.create({
          recipient: assigneeId,
          sender: null,
          type: 'due_soon',
          message: `Task "${task.title}" is due tomorrow.`,
          link: `/dashboard/workspace/${task.workspace}/boards/${task.board}`,
        });

        if (io) {
          io.to(`user:${assigneeId.toString()}`).emit('notification:new', notif);
        }
      }
    }
  } catch (error) {
    console.error(`[Job] Error running reminder job: ${error.message}`);
  }
};

module.exports = {
  runReminderJob,
};
