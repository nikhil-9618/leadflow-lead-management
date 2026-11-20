const express = require('express');
const { getTasks, createTask, updateTask, completeTask, deleteTask } = require('../controllers/taskController');
const {
  listTasksRules,
  createTaskRules,
  updateTaskRules,
  taskIdRule,
} = require('../validators/taskValidator');
const validate = require('../middleware/validationMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { writeLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router
  .route('/')
  .get(listTasksRules, validate, getTasks)
  .post(writeLimiter, createTaskRules, validate, createTask);

router
  .route('/:id')
  .all(taskIdRule, validate, validateObjectId('id', 'Invalid task id'))
  .get(async (req, res, next) => {
    // Single task lookup kept inline: it is a thin, read-only convenience.
    const Task = require('../models/Task');
    try {
      const task = await Task.findById(req.params.id).populate('lead', 'name company status');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      return res.status(200).json({ success: true, data: task });
    } catch (error) {
      return next(error);
    }
  })
  .put(writeLimiter, updateTaskRules, validate, updateTask)
  .delete(writeLimiter, deleteTask);

router.patch('/:id/complete', taskIdRule, validate, validateObjectId('id', 'Invalid task id'), writeLimiter, completeTask);

module.exports = router;
