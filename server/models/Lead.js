const mongoose = require('mongoose');
const {
  SOURCES,
  STATUSES,
  PRIORITIES,
  PHONE_REGEX,
  EMAIL_REGEX,
} = require('../config/leadConstants');
const { calculateLeadScore } = require('../utils/scoring');

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [2000, 'A note cannot exceed 2000 characters'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [PHONE_REGEX, 'Please provide a valid phone number'],
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
      minlength: [2, 'Company must be at least 2 characters'],
      maxlength: [120, 'Company cannot exceed 120 characters'],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters'],
      default: '',
    },
    source: {
      type: String,
      enum: { values: SOURCES, message: 'Invalid lead source' },
      required: [true, 'Source is required'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid lead status' },
      default: 'New',
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: 'Invalid lead priority' },
      default: 'Medium',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    tags: {
      type: [{ type: String, trim: true, maxlength: 30 }],
      default: [],
      validate: {
        validator: (tags) => !Array.isArray(tags) || tags.length <= 10,
        message: 'A lead can have at most 10 tags',
      },
    },
    estimatedValue: {
      type: Number,
      min: [0, 'Estimated value cannot be negative'],
      max: [1000000000, 'Estimated value is too large'],
      default: 0,
    },
    lastContactedAt: { type: Date, default: null },
    nextFollowUpAt: { type: Date, default: null },
    notes: { type: [noteSchema], default: [] },
    score: { type: Number, default: 0, min: 0, max: 100 },
    scoreBand: {
      type: String,
      enum: ['Cold', 'Warm', 'Hot'],
      default: 'Cold',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

/**
 * Business rule: an email address may only exist once in the CRM.
 * Enforced by a unique index; the controllers translate duplicate-key errors
 * into HTTP 409 and the CSV importer reports the row as a duplicate.
 */
leadSchema.index({ email: 1 }, { unique: true });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ score: -1 });
leadSchema.index({ nextFollowUpAt: 1 });

/** Recalculates the derived score on every write path that uses save(). */
leadSchema.pre('save', function recalculateScore(next) {
  const { score, scoreBand } = calculateLeadScore(this);
  this.score = score;
  this.scoreBand = scoreBand;
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
