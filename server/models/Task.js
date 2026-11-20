const mongoose = require('mongoose');
const { PRIORITIES } = require('../config/leadConstants');

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters'],
      maxlength: [120, 'Task title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Task description cannot exceed 1000 characters'],
      default: '',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    dueTime: {
      type: String,
      trim: true,
      match: [/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Due time must use the HH:mm format'],
      default: '',
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: 'Invalid task priority' },
      default: 'Medium',
    },
    status: {
      type: String,
      enum: { values: TASK_STATUSES, message: 'Invalid task status' },
      default: 'Pending',
    },
    completedAt: { type: Date, default: null },
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

taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.TASK_STATUSES = TASK_STATUSES;
