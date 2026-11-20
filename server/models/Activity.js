const mongoose = require('mongoose');

const ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'deleted',
  'note_added',
  'followup_scheduled',
  'imported',
  'task_created',
  'task_completed',
];

/**
 * Append-only audit trail. Activities are written by the API and are never
 * exposed for update or delete, which keeps the history trustworthy.
 * Rows survive deletion of their lead (the lead reference simply dangles).
 */
const activitySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Activity must reference a lead'],
      index: true,
    },
    action: {
      type: String,
      enum: { values: ACTIONS, message: 'Invalid activity type' },
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
      maxlength: [500, 'Activity description is too long'],
    },
    actor: { type: String, trim: true, maxlength: 80, default: 'system' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

activitySchema.index({ lead: 1, createdAt: -1 });

/** Audit records are immutable: block any save on a persisted document. */
activitySchema.pre('save', function blockUpdates(next) {
  if (!this.isNew) {
    return next(new Error('Activity records are immutable'));
  }
  return next();
});

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIONS = ACTIONS;
