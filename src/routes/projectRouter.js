const express = require("express");
const projectRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Project = require("../models/project");
const ProjectJoinRequest = require("../models/projectJoinRequest");
const ProjectActivity = require("../models/projectActivity");

// Create a new project
projectRouter.post("/project/create", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { title, description, skillsRequired, interestsTags } = req.body;

    if (!title || !description || !skillsRequired || !interestsTags) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const newProject = new Project({
      title,
      description,
      skillsRequired,
      interestsTags,
      createdBy: loggedUser._id,
      collaborators: [loggedUser._id],
    });

    await newProject.save();

    res.status(201).json({
      message: "Project created successfully!",
      project: newProject,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

projectRouter.get("/projects/feed", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const {
      page = 1,
      limit = 10,
      search = "",
      skills = "",
      interests = "",
    } = req.query;
    const skip = (page - 1) * limit;

    const requestedProjectIds = await ProjectJoinRequest.find({
      userId: loggedUser._id,
      status: { $in: ["pending", "accepted", "invited"] },
    }).distinct("projectId");

    const filter = {
      createdBy: { $ne: loggedUser._id },
      collaborators: { $ne: loggedUser._id },
      _id: { $nin: requestedProjectIds },
      status: "open",
      $or: [
        { skillsRequired: { $in: loggedUser.interests } },
        { interestsTags: { $in: loggedUser.interests } },
      ],
    };

    if (search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (skills.trim()) {
      // Convert each skill into a RegExp for case-insensitive exact matching.
      const skillsArray = skills
        .split(",")
        .map((skill) => new RegExp(`^${skill.trim()}$`, "i"));
      filter.skillsRequired = { $in: skillsArray };
    }

    if (interests.trim()) {
      // Convert each interest into a RegExp for case-insensitive exact matching.
      const interestsArray = interests
        .split(",")
        .map((interest) => new RegExp(`^${interest.trim()}$`, "i"));
      filter.interestsTags = { $in: interestsArray };
    }
    // Retrieve the ignored projects from the logged-in user
    const ignored = loggedUser.ignoredProjects || [];

    // Combine the project IDs to exclude
    filter._id = { $nin: [...requestedProjectIds, ...ignored] };

    const projects = await Project.find(filter)
      .populate("createdBy", "firstName lastName emailId photoUrl")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      message: "Projects fetched successfully",
      data: projects,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save project endpoint using $addToSet for atomic update
projectRouter.post("/project/:projectId/save", userAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    await req.user.constructor.findByIdAndUpdate(req.user._id, {
      $addToSet: { savedProjects: projectId },
    });
    res.json({ message: "Project saved for future reference!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
projectRouter.get("/projects/saved", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const savedIds = loggedUser.savedProjects || [];
    const ignored = loggedUser.ignoredProjects || [];

    // Fetch only projects that are in savedProjects and NOT in ignoredProjects, and have status "open"
    const savedProjects = await Project.find({
      $and: [{ _id: { $in: savedIds } }, { _id: { $nin: ignored } }],
      status: "open",
    })
      .populate("createdBy", "firstName lastName emailId photoUrl")
      .sort({ createdAt: -1 });

    res.json({
      message: "Fetched saved projects successfully",
      data: savedProjects,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ignore project endpoint using $addToSet for atomic update
projectRouter.post("/project/:projectId/ignore", userAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    await req.user.constructor.findByIdAndUpdate(req.user._id, {
      $addToSet: { ignoredProjects: projectId },
    });
    res.json({
      message: "Project ignored. It will no longer appear in your feed!",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a join request to a project with a role
projectRouter.post("/project/join/:projectId", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { projectId } = req.params;
    const { message, role } = req.body;

    if (!role || typeof role !== "string") {
      return res
        .status(400)
        .json({ message: "Role is required to join the project." });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    // Prevent creator from joining their own project
    if (project.createdBy.toString() === loggedUser._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot join your own project!" });
    }

    // Check if user is already a collaborator
    if (project.collaborators.includes(loggedUser._id)) {
      return res
        .status(400)
        .json({ message: "You are already a collaborator!" });
    }

    // Check if a join request already exists
    const existingRequest = await ProjectJoinRequest.findOne({
      userId: loggedUser._id,
      projectId,
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You have already requested to join this project!" });
    }

    // Create a new join request
    const newRequest = new ProjectJoinRequest({
      userId: loggedUser._id,
      projectId,
      message: message || "",
      role,
      status: "pending",
    });

    await newRequest.save();

    res.status(201).json({
      message: "Join request sent successfully!",
      data: newRequest,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch projects created by the logged-in user
projectRouter.get("/projects/my-projects", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Fetch projects created by the user
    const myProjects = await Project.find({ createdBy: loggedUser._id })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate("collaborators", "firstName lastName emailId photoUrl"); // Get collaborator info

    res.json({
      message: "Your projects fetched successfully!",
      data: myProjects,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

projectRouter.get("/project/:projectId", userAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Fetch project details
    const project = await Project.findById(projectId)
      .populate("createdBy", "firstName lastName emailId photoUrl")
      .populate("collaborators", "firstName lastName emailId photoUrl");

    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    // Fetch join requests for this project
    const joinRequests = await ProjectJoinRequest.find({
      projectId,
      status: "pending",
    }).populate("userId", "firstName lastName emailId photoUrl");

    res.json({
      message: "Project details fetched successfully",
      data: {
        project,
        joinRequests,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Accept a join request and add user to collaborators
projectRouter.post(
  "/project/:projectId/request/:requestId/accept",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId, requestId } = req.params;

      // Check if project exists and if the logged-in user is the creator
      const project = await Project.findById(projectId);
      if (!project)
        return res.status(404).json({ message: "Project not found!" });
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Find and update the join request
      const request = await ProjectJoinRequest.findById(requestId).populate(
        "userId",
        "firstName lastName emailId photoUrl skills experience"
      );
      if (!request || request.projectId.toString() !== projectId) {
        return res.status(404).json({ message: "Join request not found!" });
      }

      request.status = "accepted";
      await request.save();

      // Add user to collaborators if not already added
      if (!project.collaborators.includes(request.userId._id)) {
        project.collaborators.push(request.userId._id);
        await project.save();
      }

      res.json({
        message: "Join request accepted!",
        data: {
          user: request.userId, // Return detailed user info
          status: request.status,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
// Reject a join request
projectRouter.post(
  "/project/:projectId/request/:requestId/reject",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId, requestId } = req.params;

      // Check if project exists and if the logged-in user is the creator
      const project = await Project.findById(projectId);
      if (!project)
        return res.status(404).json({ message: "Project not found!" });
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Find and update the join request
      const request = await ProjectJoinRequest.findById(requestId).populate(
        "userId",
        "firstName lastName emailId photoUrl skills experience"
      );
      if (!request || request.projectId.toString() !== projectId) {
        return res.status(404).json({ message: "Join request not found!" });
      }

      request.status = "rejected";
      await request.save();

      res.json({
        message: "Join request rejected!",
        data: {
          user: request.userId, // Return detailed user info
          status: request.status,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
// Fetch join requests for a specific project
projectRouter.get(
  "/project/:projectId/requests",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;

      // Check if project exists and if the logged-in user is the creator
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found!" });
      }
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Fetch pending join requests
      const joinRequests = await ProjectJoinRequest.find({
        projectId,
        status: "pending",
      }).populate("userId", "firstName lastName emailId photoUrl");

      res.json({
        message: "Join requests fetched successfully!",
        data: joinRequests,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
// Toggle project status (open/closed)
projectRouter.patch(
  "/project/:projectId/status",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;
      const { status } = req.body;

      if (!status || (status !== "open" && status !== "closed")) {
        return res.status(400).json({ message: "Invalid status provided!" });
      }

      // Find the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found!" });
      }

      // Only the creator can toggle the status
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Update project status
      project.status = status;
      await project.save();

      res.json({
        message: "Project status updated successfully",
        data: project,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

projectRouter.get(
  "/project/:projectId/requests/pending",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;

      // Check if project exists and if the logged-in user is the creator
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found!" });
      }
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Fetch pending join requests
      const pendingRequests = await ProjectJoinRequest.find({
        projectId,
        status: "pending",
      }).populate("userId", "firstName lastName emailId photoUrl");

      if (pendingRequests.length === 0) {
        return res.json({ message: "No pending requests found", data: [] });
      }

      res.json({
        message: "Pending join requests fetched successfully!",
        data: pendingRequests,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
projectRouter.get(
  "/project/:projectId/activity",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;

      // Check if project exists and if the logged-in user is a collaborator or creator
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found!" });
      }
      if (
        project.createdBy.toString() !== loggedUser._id.toString() &&
        !project.collaborators.includes(loggedUser._id)
      ) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Fetch activity logs for the project
      const activities = await ProjectActivity.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(20); // Limit to latest 20 activities

      if (activities.length === 0) {
        return res.json({ message: "No activities found", data: [] });
      }

      res.json({
        message: "Activity feed fetched successfully!",
        data: activities,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
projectRouter.get("/project/:projectId/invites", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { projectId } = req.params;

    // Check if project exists and if the logged-in user is the creator
    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ message: "Project not found!" });
    if (project.createdBy.toString() !== loggedUser._id.toString()) {
      return res.status(403).json({ message: "Access denied!" });
    }

    // Fetch all invites with status 'invited'
    const invites = await ProjectJoinRequest.find({
      projectId,
      status: "invited",
    }).populate("userId", "firstName lastName emailId photoUrl");

    if (invites.length === 0) {
      return res.json({ message: "No invites found", data: [] });
    }

    res.json({
      message: "Invites fetched successfully!",
      data: invites,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Invite a user to a project with optional role
projectRouter.post("/project/:projectId/invite", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { projectId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required!" });
    }

    // Check if project exists and if the logged-in user is the creator
    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ message: "Project not found!" });
    if (project.createdBy.toString() !== loggedUser._id.toString()) {
      return res.status(403).json({ message: "Access denied!" });
    }

    // Check if user is already a collaborator
    if (project.collaborators.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User is already a collaborator!" });
    }

    // Check if the user is already invited or has a pending request
    const existingRequest = await ProjectJoinRequest.findOne({
      userId,
      projectId,
    });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "User has already been invited to this project!" });
    }

    // Create a new join request with status 'invited' and use provided role or default to 'Contributor'
    const newInvitation = new ProjectJoinRequest({
      userId,
      projectId,
      role: role || "Contributor", // Use provided role or default to 'Contributor'
      status: "invited",
    });
    await newInvitation.save();

    res.status(201).json({
      message: "User invited successfully!",
      data: newInvitation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Accept an invite
projectRouter.post(
  "/project/:projectId/invite/:inviteId/accept",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId, inviteId } = req.params;

      // Find the invite
      const invite = await ProjectJoinRequest.findOne({
        _id: inviteId,
        projectId,
        userId: loggedUser._id,
        status: "invited",
      });
      if (!invite) {
        return res
          .status(404)
          .json({ message: "Invite not found or already processed!" });
      }

      // Accept the invite
      invite.status = "accepted";
      await invite.save();

      // Add user as a collaborator
      const project = await Project.findById(projectId);
      if (!project.collaborators.includes(loggedUser._id)) {
        project.collaborators.push(loggedUser._id);
        await project.save();
      }

      res.json({
        message: "Invite accepted successfully!",
        data: { status: "accepted" },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Reject an invite
projectRouter.post(
  "/project/:projectId/invite/:inviteId/reject",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId, inviteId } = req.params;

      // Find the invite
      const invite = await ProjectJoinRequest.findOne({
        _id: inviteId,
        projectId,
        userId: loggedUser._id,
        status: "invited",
      });
      if (!invite) {
        return res
          .status(404)
          .json({ message: "Invite not found or already processed!" });
      }

      // Reject the invite
      invite.status = "rejected";
      await invite.save();

      res.json({
        message: "Invite rejected successfully!",
        data: { status: "rejected" },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
// Fetch invites for the logged-in user
projectRouter.get("/my-invites", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;

    // Find invites for the logged-in user
    const invites = await ProjectJoinRequest.find({
      userId: loggedUser._id,
      status: { $in: ["invited", "accepted", "rejected"] },
    }).populate({
      path: "projectId",
      select: "name description createdBy",
      populate: {
        path: "createdBy",
        select: "firstName lastName",
      },
    });

    if (invites.length === 0) {
      return res.json({ message: "No invites found", data: [] });
    }

    res.json({
      message: "Invites fetched successfully!",
      data: invites,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
projectRouter.get(
  "/project/:projectId/analytics",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { projectId } = req.params;

      // Check if project exists and if the logged-in user is the creator
      const project = await Project.findById(projectId);
      if (!project)
        return res.status(404).json({ message: "Project not found!" });
      if (project.createdBy.toString() !== loggedUser._id.toString()) {
        return res.status(403).json({ message: "Access denied!" });
      }

      // Fetch analytics data
      const totalRequests = await ProjectJoinRequest.countDocuments({
        projectId,
      });
      const pendingRequests = await ProjectJoinRequest.countDocuments({
        projectId,
        status: "pending",
      });
      const acceptedCollaborators = project.collaborators.length;

      // Find most common skills among collaborators
      const collaborators = await Project.findById(projectId).populate(
        "collaborators",
        "skills"
      );
      const skillCounts = {};
      collaborators.collaborators.forEach((user) => {
        user.skills.forEach((skill) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });
      const mostCommonSkills = Object.keys(skillCounts)
        .sort((a, b) => skillCounts[b] - skillCounts[a])
        .slice(0, 3);

      res.json({
        message: "Project analytics fetched successfully!",
        data: {
          totalRequests,
          pendingRequests,
          acceptedCollaborators,
          mostCommonSkills,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
/* // Fetch all projects involving the logged-in user (as creator, collaborator, or any role)
projectRouter.get("/projects/my-involvement", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find projects where the user is either the creator or a collaborator
    const myProjects = await Project.find({
      $or: [
        { createdBy: loggedUser._id },           // Projects created by the user
        { collaborators: loggedUser._id },        // Projects where the user is a collaborator
        { "otherRoles.userId": loggedUser._id }   // Projects where the user is assigned any role (if you have such a field)
      ]
    })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })                     // Sort by newest first
      .populate("createdBy", "firstName lastName emailId photoUrl")   // Get creator info
      .populate("collaborators", "firstName lastName emailId photoUrl") // Get collaborator info
      .populate("otherRoles.userId", "firstName lastName emailId photoUrl"); // Get other roles info if applicable

    if (myProjects.length === 0) {
      return res.json({ message: "You are not involved in any projects yet.", data: [] });
    }

    res.json({
      message: "Projects involving you fetched successfully!",
      data: myProjects,
    });
  } catch (err) {
    console.error("Error fetching projects involving the user:", err.message);
    res.status(500).json({ error: err.message });
  }
}); */
// Fetch all users assigned to a specific project
// Fetch only collaborators of a specific project excluding the creator
projectRouter.get("/project/:projectId/users", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { projectId } = req.params;

    // Check if the project exists
    const project = await Project.findById(projectId)
      .populate("createdBy", "firstName lastName emailId photoUrl")
      .populate("collaborators", "firstName lastName emailId photoUrl");

    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    // Check if the logged-in user is authorized to view project users
    if (
      project.createdBy._id.toString() !== loggedUser._id.toString() &&
      !project.collaborators.some(
        (collaborator) =>
          collaborator._id.toString() === loggedUser._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Access denied!" });
    }

    // Filter out the creator from the collaborators list
    const collaboratorsExcludingCreator = project.collaborators.filter(
      (collaborator) =>
        collaborator._id.toString() !== project.createdBy._id.toString()
    );

    // Prepare a list of collaborators excluding the creator
    const users = [
      project.createdBy, // Project creator (separate)
      ...collaboratorsExcludingCreator, // Collaborators excluding creator
    ];

    res.json({
      message: "Collaborators fetched successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Error fetching project collaborators:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Edit Project Details
// Edit Project Details (Partial Update)
projectRouter.patch("/project/:projectId/edit", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { projectId } = req.params;
    const { title, description, skillsRequired, interestsTags } = req.body;

    // Check if project exists and if the logged-in user is the creator
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    if (project.createdBy.toString() !== loggedUser._id.toString()) {
      return res.status(403).json({ message: "Access denied!" });
    }

    // Update only the fields that are provided
    if (title) project.title = title;
    if (description) project.description = description;
    if (skillsRequired) project.skillsRequired = skillsRequired;
    if (interestsTags) project.interestsTags = interestsTags;

    await project.save();

    res.json({
      message: "Project updated successfully!",
      data: project,
    });
  } catch (err) {
    console.error("Error updating project:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fetch projects where the user is a collaborator (including projects created by the user)
projectRouter.get("/projects/my-collaborations", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const myCollaborations = await Project.find({
      collaborators: loggedUser._id,
    })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName emailId photoUrl")
      .populate("collaborators", "firstName lastName emailId photoUrl");

    if (myCollaborations.length === 0) {
      return res.json({
        message: "No projects found where you are a collaborator.",
        data: [],
      });
    }

    res.json({
      message: "Projects where you are a collaborator fetched successfully!",
      data: myCollaborations,
    });
  } catch (err) {
    console.error("Error fetching collaboration projects:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = projectRouter;
