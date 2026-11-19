import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  processAIChat,
  summarizeDashboard,
  parseSmartLeave
} from '../services/aiService.js';
import { getAILogs } from '../services/commsService.js';

const router = express.Router();

// AI Chat with Tools and Role Scope
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const result = await processAIChat({ prompt, user: req.user });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Dashboard Summarizer
router.post('/summarize-dashboard', authenticate, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { kpiData } = req.body;
    if (!kpiData) return res.status(400).json({ error: 'kpiData is required.' });

    const result = await summarizeDashboard({ kpiData, user: req.user });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Smart Leave Intent Parser
router.post('/smart-leave', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const result = await parseSmartLeave({ prompt, user: req.user });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// AI Logs (Admin only)
router.get('/logs', authenticate, requireRole('admin'), (req, res) => {
  try {
    const logs = getAILogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
