const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['ADMIN', 'APPROVER', 'AUDITOR'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'AUDITOR',
    },
    // The on-chain address this user signs transactions with in the
    // frontend. For APPROVER users, this should match one of the
    // MultiSigWallet's owners for their approvals to mean anything.
    walletAddress: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    walletAddress: this.walletAddress,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
