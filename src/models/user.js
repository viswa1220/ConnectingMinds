const mongoose = require("mongoose");
const validate = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      unique: true,
      validate(value) {
        if (!validate.isEmail(value)) {
          throw new Error("Email format invalid");
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validate.isStrongPassword(value)) {
          throw new Error("Please Enter a Strong Password");
        }
      },
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      validate(value) {
        if (!["male", "female", "others"].includes(value)) {
          throw new Error("Gender not valid");
        }
      },
    },
    photoUrl: {
      type: String,
      default: "https://whiteklay.com/prod-dummy-image-1/",
      validate(value) {
        if (!validate.isURL(value)) {
          throw new Error("Invalid URL");
        }
      },
    },
    about: {
      type: String,
      default: "This is a default about",
    },
    experience: {
      type: Number,
    },
    skills: {
      type: [String],
    },
    techStack: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
      validate(value) {
        if (value.length === 0) throw new Error("At least one interest is required.");
      },
    },
    projectsCreated: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
      },
    ],
    
  },
  {
    timestamps: true,
  }
);

// Generate JWT Token
userSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id }, "Dev@cm$12052000", {
    expiresIn: "10d",
  });
  return token;
};

// Validate Password
userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;
  const isPasswordvalid = await bcrypt.compare(passwordInputByUser, passwordHash);
  return isPasswordvalid;
};

module.exports = mongoose.model("user", userSchema);
