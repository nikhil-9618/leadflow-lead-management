const { SCORING_RULES } = require('../config/scoringRules');
const { SCORE_BANDS } = require('../config/leadConstants');

/**
 * Computes the rule-based score for a lead.
 *
 * @returns {{ score: number, scoreBand: string, breakdown: Array<{key,label,points,earned}> }}
 */
const calculateLeadScore = (lead) => {
  const breakdown = SCORING_RULES.map((rule) => {
    const earned = Boolean(rule.describe(lead));
    return {
      key: rule.key,
      label: rule.label,
      points: rule.points,
      earned,
      awarded: earned ? rule.points : 0,
    };
  });

  const raw = breakdown.reduce((total, rule) => total + rule.awarded, 0);
  const score = Math.max(0, Math.min(100, raw));
  const match = SCORE_BANDS.find((entry) => score >= entry.min && score <= entry.max);

  return { score, scoreBand: match ? match.band : 'Cold', breakdown };
};

module.exports = { calculateLeadScore };
