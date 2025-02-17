const validate = require("validator");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password, skills } = req.body;
  if (!firstName || !lastName) {
    throw new Error("Please enter the Name!");
  } else if (!validate.isEmail(emailId)) {
    throw new Error("Email is not valid");
  } else if (!validate.isStrongPassword(password)) {
    throw new Error("Password not Strong..");
  } else if (skills.length > 20) {
    throw new Error("more than 20 skills not allowed");
  }
};

module.exports = {
  validateSignUpData,
};
