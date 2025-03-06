// routes/taskRouter.js
const express = require("express");
const taskRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Task = require("../models/task");
const Project = require("../models/project");

// Create a new task for a project
// Create a new task for a project
taskRouter.post("/project/:projectId/task", userAuth, async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;
      const { title, description, assignedTo, dueDate, priority, labels } = req.body;
  
      if (!title) {
        return res.status(400).json({ message: "Task title is required!" });
      }
  
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found!" });
  
      const task = new Task({
        projectId,
        title,
        description,
        assignedTo: assignedTo || null,
        createdBy: loggedUser._id,
        dueDate: dueDate || null,
        priority: priority || "Medium",
        labels: Array.isArray(labels) ? labels : []
      });
      await task.save();
  
      res.status(201).json({
        message: "Task created successfully!",
        data: task
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
taskRouter.patch("/project/:projectId/task/:taskId", userAuth, async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { status } = req.body;
      const allowedStatuses = ["To Do", "In Progress", "Done"];
  
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status!" });
      }
  
      const task = await Task.findOneAndUpdate({ _id: taskId, projectId }, { status }, { new: true });
      if (!task) return res.status(404).json({ message: "Task not found!" });
  
      res.json({ message: "Task status updated successfully!", data: task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Assign task to a collaborator
taskRouter.patch("/project/:projectId/task/:taskId/assign", userAuth, async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { assignedTo } = req.body;
  
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found!" });
      if (!project.collaborators.includes(assignedTo)) {
        return res.status(400).json({ message: "User is not a collaborator!" });
      }
  
      const task = await Task.findOneAndUpdate({ _id: taskId, projectId }, { assignedTo }, { new: true });
      if (!task) return res.status(404).json({ message: "Task not found!" });
  
      res.json({ message: "Task assigned successfully!", data: task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // Fetch all tasks for a project
taskRouter.get("/project/:projectId/tasks", userAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
  
      const tasks = await Task.find({ projectId }).sort({ createdAt: -1 });
      if (tasks.length === 0) {
        return res.json({ message: "No tasks found", data: [] });
      }
  
      res.json({
        message: "Tasks fetched successfully!",
        data: tasks
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
// Add a comment to a task
taskRouter.post("/project/:projectId/task/:taskId/comment", userAuth, async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { text } = req.body;
      const loggedUser = req.user;
  
      if (!text) {
        return res.status(400).json({ message: "Comment text is required!" });
      }
  
      const comment = new Comment({
        taskId,
        text,
        createdBy: loggedUser._id
      });
      await comment.save();
  
      res.status(201).json({ message: "Comment added successfully!", data: comment });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  //fetch comments

  taskRouter.get("/project/:projectId/task/:taskId/comments", userAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const comments = await Comment.find({ taskId }).populate("createdBy", "firstName lastName").sort({ createdAt: -1 });
  
      if (comments.length === 0) {
        return res.json({ message: "No comments found", data: [] });
      }
  
      res.json({ message: "Comments fetched successfully!", data: comments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
    // Fetch tasks nearing deadline
taskRouter.get("/project/:projectId/tasks/deadlines", userAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
      const now = dayjs();
      const upcomingDeadline = now.add(3, "day").toDate();
  
      const tasks = await Task.find({
        projectId,
        dueDate: { $lte: upcomingDeadline, $gte: now.toDate() },
        status: { $ne: "Done" }
      }).sort({ dueDate: 1 });
  
      if (tasks.length === 0) {
        return res.json({ message: "No tasks nearing deadline", data: [] });
      }
  
      res.json({ message: "Tasks nearing deadline fetched successfully!", data: tasks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // Fetch task analytics for a project
taskRouter.get("/project/:projectId/tasks/analytics", userAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
  
      const totalTasks = await Task.countDocuments({ projectId });
      const completedTasks = await Task.countDocuments({ projectId, status: "Done" });
      const pendingTasks = totalTasks - completedTasks;
  
      // Calculate average completion time for tasks marked as Done
      const completedTaskDetails = await Task.find({ projectId, status: "Done" });
      let totalCompletionTime = 0;
      completedTaskDetails.forEach(task => {
        const createdAt = dayjs(task.createdAt);
        const completedAt = dayjs(task.updatedAt);
        totalCompletionTime += completedAt.diff(createdAt, "hour");
      });
      const averageCompletionTime = completedTaskDetails.length > 0 ? (totalCompletionTime / completedTaskDetails.length).toFixed(2) : 0;
  
      res.json({
        message: "Task analytics fetched successfully!",
        data: {
          totalTasks,
          completedTasks,
          pendingTasks,
          averageCompletionTime: `${averageCompletionTime} hours`
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

module.exports = taskRouter;
