import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    active: {
      type: Boolean,
      default: true,
      //   select: false,
    },
    document: {
      chunksIds: [String],
      fileName: String,
      fileType: String,
      uploadedAt: Date,
      totalChunks: {
        type: Number,
        default: 0,
      },
      atsScore: {
        score: Number, // 0-100
        feedback: {
          strengths: [String],
          weaknesses: [String],
          recommendations: [String],
        },
        breakdown: {
          formatting: Number,
          keywords: Number,
          contact: Number,
          experience: Number,
          education: Number,
          sections: Number,
          atsCompatibility: Number,
        },
        analyzedAt: Date,
      },
      personalInformation: {
        fullName: String,
        email: String,
        phone: String,
        location: String,
        linkedin: String,
        github: String,
        portfolio: String,
        summary: String,
      },
      technicalSkills: [String],
      yearsOfExperience: Number,
      education: [
        {
          degree: String,
          field: String,
          institution: String,
          location: String,
          startDate: String,
          endDate: String,
          gpa: String,
          honors: String,
        },
      ],
    },
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 });
userSchema.index({ active: 1 });

// Hash password before saving
userSchema.pre("save", async function () {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return;

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// Update passwordChangedAt when password is modified
userSchema.pre("save", function () {
  if (!this.isModified("password") || this.isNew) {
    return;
  }
  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.updateDocument = function (
  chunksIds,
  fileName,
  fileType,
  cvAnalysis = null
) {
  this.document = {
    chunksIds,
    fileName,
    fileType,
    uploadedAt: new Date(),
    totalChunks: chunksIds.length,
    ...(cvAnalysis?.atsScore && { atsScore: cvAnalysis.atsScore }),
    ...(cvAnalysis?.personalInformation && {
      personalInformation: cvAnalysis.personalInformation,
    }),
    ...(cvAnalysis?.technicalSkills && {
      technicalSkills: cvAnalysis.technicalSkills,
    }),
    ...(cvAnalysis?.yearsOfExperience !== undefined && {
      yearsOfExperience: cvAnalysis.yearsOfExperience,
    }),
    ...(cvAnalysis?.education && {
      education: cvAnalysis.education,
    }),
  };
  return this.save();
};

userSchema.methods.clearDocument = function () {
  this.document = {
    chunksIds: [],
    fileName: null,
    fileType: null,
    uploadedAt: null,
    totalChunks: 0,
  };
  return this.save();
};

const User = mongoose.model("User", userSchema);
export default User;
