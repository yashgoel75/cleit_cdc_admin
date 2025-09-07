import mongoose from "mongoose";
import { Schema } from "mongoose";

const job = new Schema({
    company: String,
    role: String,
    location: String,
    description: String,
    deadline: String,
    postedAt: { type: Date, default: Date.now },
    jobDescriptionPdf: String,
    eligibility: [String],
    linkToApply: String,
    studentsApplied: [String],
    extraFields: [{
    fieldName: {
      type: String,
      required: true,
    },
    fieldValue: {
      type: String,
      required: true,
    },
  }],
}, { timestamps: true })

const test = new Schema({
    title: { type: String, required: true },
    description: String,
    date: String,
    time: String,
    duration: String,
    mode: { type: String },
    link: String,
    instructions: [String],
    eligibility: [String],
    deadline: String,
    studentsApplied: [String]
}, { timestamps: true })

const user = new Schema({
    name: String,
    username: String,
    collegeEmail: String,
    personalEmail: String,
    enrollmentNumber: String,
    phone: Number,
    department: String,
    tenthPercentage: Number,
    twelfthPercentage: Number,
    collegeGPA: Number,
    batchStart: Number,
    batchEnd: Number,
    linkedin: String,
    github: String,
    leetcode: String,
    resume: String,
    status: String,
    wishlist: [{ societyUsername: String }],
    reminders: [{ societyUsername: String }],
});

const admin = new Schema({
    name: String,
    email: String,
    phone: Number
})

const Job = mongoose.models.Job || mongoose.model("Job", job);
const Test = mongoose.models.Test || mongoose.model("Test", test);
const User = mongoose.models.User || mongoose.model("User", user);
const Admin = mongoose.models.Admin || mongoose.model("Admin", admin);

export { Job, User, Test, Admin };