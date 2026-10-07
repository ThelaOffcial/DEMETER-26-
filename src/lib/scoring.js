import { QUESTION_BANK } from '../data/questions'
import { QUESTION_BANK_EN } from '../data/questionsEn'

export const ANSWER_KEY = {
  1: "ඔක්තෝබර් 5",
  2: "ශ්‍රී ලංකා අලියා",
  3: "බෙංගාල බොක්ක",
  4: "කොංගෝ වැසි වනාන්තරය",
  5: "සෞදි අරාබිය",
  6: "128",
  7: "ඇමසන්",
  8: "ආක්ටික් සාගරය",
  9: "1340 km",
  10: "සල්ෆියුරික් අම්ලය",
  11: "ටෝමා විල",
  12: "සුරිනාමය",
  13: "බන්දුල පෙතියා",
  14: "ඇල්ඩ්‍රින් ( Aldrin)",
  15: "බාසල් සම්මුතිය",
  16: "ශ්‍රී ලංකා කැහිබෙල්ලා",
  17: "ක්‍රැකටෝවා -1883",
  18: "කොණ්ඩවට්ටවාන්",
  19: "යෙනිසි",
  20: "මිලියන 1",
  21: "1988දී මිනිසා හා ජෛව ගෝල රක්ෂිතයක් ලෙස නම් කළේය.",
  22: "මෙසෝඇමරිකානු බාධක කොරල් පරය නොහොත් මහා මායානු කොරල් පරය",
  23: "ඉන්දියාව",
  24: "දුම්කොළවලින් පිටවන දුම ( සිගරට් දුම )",
  25: "ප්‍රංශය",
  26: "1984",
  27: "පොල්ගොල්ල",
  28: "36",
  29: "බයිජි ඩොල්ෆින්",
  30: "සියයට 25ක්",
  31: "චීනය",
  32: "අයිස්ලන්තය",
  33: "MISHTI",
  34: "සාර්නෝ ගග",
  35: "පිලිපීනය ආශ්‍රිත පැසිපික් සාගරය",
  36: "ස්ථීර කාබනික දූෂක වලින් ශාක හා සතුන් ආරක්‍ෂා කිරීම",
  37: "අවුලකපෝරා",
  38: "මල් පුලුට්ටා",
  39: "මිචිගන් විල",
  40: "ගුජරාටය",
  41: "සියයට 30",
  42: "ශ්‍රී ලංකා පඩුවන් බස්සා",
  43: "තෙත්බිම් හා බැඳුණු සාම්ප්‍රදායික දැනුම",
  44: "මිනිසුන් විසින් වසරකට වනාන්තර හෙක්ටයාර මිලියන 9.10ක් කපා දමයි.",
  45: "ශ්‍රී ලංකා පරිසර අමාත්‍යංශය",
  46: "ලංකා පඩුවන් බස්සා",
  47: "උතුරු සුදු රයිනෝ",
  48: "අනුරාධපුර",
  49: "වායුසමීකරණ යන්ත්‍රවලින් පිටවන වායුන්",
  50: "අග්නිදිග ආසියාව",
}

export const TOTAL_Q = Object.keys(ANSWER_KEY).length
export const FAST_BONUS_THRESHOLD = 25
export const FAST_BONUS_MARKS = 5
export const MAX_SCORE = 120

export function marksForQuestion(id) {
  if (id <= 15) return 1
  if (id <= 35) return 2
  return 4
}

export function mergeKey(override) {
  return { ...ANSWER_KEY, ...(override || {}) }
}

export function scoreSubmission(sub, key = ANSWER_KEY) {
  let rawScore = 0
  let fastCount = 0
  let answered = 0
  let correctCount = 0
  const details = []
  for (let i = 1; i <= TOTAL_Q; i++) {
    const ans = sub.answers && sub.answers[i]
    const given =
      ans && typeof ans === 'object' && ans.value !== undefined ? ans.value : ans
    const correct = key[i]
    const marks = marksForQuestion(i)
    const isCorrect = given !== undefined && given === correct
    if (given !== undefined) answered++
    if (isCorrect) {
      rawScore += marks
      correctCount++
    }
    const fast =
      !!(ans && typeof ans === 'object' && ans.fast) ||
      !!(sub.fastAnswers && sub.fastAnswers[i])
    if (fast) fastCount++
    details.push({ id: i, given, correct, isCorrect, marks, fast })
  }
  const bonus = fastCount > FAST_BONUS_THRESHOLD ? FAST_BONUS_MARKS : 0
  return { score: rawScore + bonus, rawScore, bonus, correct: correctCount, fastCount, answered, details }
}

// English-medium submissions store English option text. Option order is identical
// in both banks, so convert each answer to the Sinhala option text and every
// existing scoring / answer-key / stats feature works for both mediums.
export function normalizeSubmission(sub) {
  if (!sub || sub.lang !== 'en' || !sub.answers) return sub
  const answers = {}
  Object.entries(sub.answers).forEach(([id, a]) => {
    const isObj = a && typeof a === 'object'
    const val = isObj ? a.value : a
    const qEn = QUESTION_BANK_EN.find((q) => q.id === Number(id))
    const qSi = QUESTION_BANK.find((q) => q.id === Number(id))
    const idx = qEn ? qEn.options.indexOf(val) : -1
    const si = idx >= 0 && qSi ? qSi.options[idx] : val
    answers[id] = isObj ? { ...a, value: si } : si
  })
  return { ...sub, answers }
}
