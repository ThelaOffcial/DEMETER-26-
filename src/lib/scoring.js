export const ANSWER_KEY = {
  1: '23rd of March',
  2: '197',
  3: 'Citarum River',
  4: 'Ionian Sea',
  5: 'Using Old Refrigerators',
  6: 'The Central and the Eastern equatorial Pacific Ocean',
  7: 'Minamata Convention - Japan',
  8: 'Dire Wolf',
  9: 'The Ceylon Rose',
  10: 'Western Ghats',
  11: 'Amu Darya, Syr Darya and the Jordan River',
  12: 'Challenger Deep',
  13: '700 years',
  14: 'Lake Baikal - Russia',
  15: 'The salt water crocodile',
  16: 'Jacobabad',
  17: 'Yamuna River and Ganga River',
  18: 'Panthera pardus sinhaleyus',
  19: 'Bulathsinhala',
  20: 'Convection Currents',
  21: 'Galapagos Archipelago',
  22: 'Aldabra Giant Tortoise',
  23: 'Green Turtle',
  24: 'Chernobyl - 1986',
  25: 'South Korea',
  26: 'Meghalaya',
  27: '2.7 Million Ha',
  28: 'South China Tiger',
  29: 'Paleoloxodon namadicus',
  30: 'Sumatran Elephant',
  31: 'Muthurajawela',
  32: '1981',
  33: 'Bangladesh',
  34: 'Silavathurai',
  35: 'Namami Gange',
  36: 'Colombo',
  37: 'Sundarbans',
  38: 'King Dutugemunu',
  39: 'Mullaitivu and Trincomalee',
  40: 'Victoria',
  41: 'Sulaiman and Indus',
  42: 'Gal Oya',
  43: 'Adenosine Tri Pospate',
  44: '103',
  45: 'East Africa',
  46: 'Kanneliya - Low Country Tropical Rainforest',
  47: 'Pathenium',
  48: 'Fukushima - Japan',
  49: 'Bar Reef - Kalpitiya Peninsula',
  50: 'From east to west, piling up warm surface water in the western Pacific near Indonesia and Australia.',
}

export const QUESTION_TEXT = {
  1: 'When is the World Meteorology Day?',
  2: 'How many countries signed the Montreal Protocol?',
  3: 'The most polluted river (main water resource of Jakarta)',
  4: 'Sea connecting the Adriatic Sea to the Mediterranean Sea',
  5: 'A way CFC is released to the atmosphere',
  6: 'Where El-Nino happens',
  7: 'Convention to protect against mercury releases, and where signed',
  8: 'Pre-historic animal revived by scientists',
  9: 'National butterfly of Sri Lanka',
  10: 'Biodiversity hotspot in India',
  11: 'Main water sources of the Aral Sea and Dead Sea',
  12: 'Deepest point in the Mariana Trench',
  13: 'Years to dissolve a toothbrush',
  14: 'Largest freshwater lake in Asia & country',
  15: 'Largest type of crocodile',
  16: 'Hottest city in Asia',
  17: 'Pair of rivers starting from glaciers',
  18: 'Scientific name of the Sri Lankan Leopard',
  19: 'Location of Walawwatta Wagurana marsh forest',
  20: 'Reason for tectonic plate movement',
  21: "Island that helped Darwin's evolution studies",
  22: 'Tortoise with longest life expectancy',
  23: 'Turtle visiting Sri Lankan coast most for laying eggs',
  24: 'Most devastated nuclear plant explosion & year',
  25: 'Country evaluated by UNEP for forest fire suppression',
  26: 'Administrative state with highest rainfall',
  27: 'Hectares of forest cover in Sri Lanka',
  28: 'Tiger sub-species with ~30 left',
  29: 'Closest ancient relative to the Sri Lankan Elephant',
  30: 'Critically endangered Asian elephant sub-species',
  31: 'Largest wetland in Sri Lanka',
  32: 'Year Central Environmental Authority established',
  33: 'Most polluted country (Air Pollution Index)',
  34: 'Sea shore in Sri Lanka known for pearls',
  35: "India's river-saving project",
  36: "City known as 'Ramsar Wetland City'",
  37: 'Largest marshland in the world',
  38: "King who implemented the 'Maghatha Law'",
  39: 'Districts of Bay of Koddiyar and Nandikadal Lagoon',
  40: 'Largest hydro-power plant in Sri Lanka',
  41: 'Mountain range and river in Pakistan',
  42: 'First farming colony in Sri Lanka',
  43: 'ATP expansion / anaerobic respiration result',
  44: 'How many rivers are there in Sri Lanka?',
  45: 'Region with high rainfall due to El-Nino',
  46: 'Forest shown on the map & its type',
  47: 'Invasive flora in the picture',
  48: '2011 nuclear plant explosion — plant & location',
  49: 'Largest coral reef in Sri Lanka',
  50: 'Trade wind direction & effect on sea surface temperature (normal conditions)',
}

export const TOTAL_Q = Object.keys(ANSWER_KEY).length
export const FAST_BONUS_THRESHOLD = 25
export const FAST_BONUS_MARKS = 5

export function marksForQuestion(id) {
  if (id <= 15) return 1
  if (id <= 35) return 2
  return 4
}

export function scoreSubmission(sub) {
  let rawScore = 0
  let fastCount = 0
  const details = []
  for (let i = 1; i <= TOTAL_Q; i++) {
    const ans = sub.answers && sub.answers[i]
    const given =
      ans && typeof ans === 'object' && ans.value !== undefined ? ans.value : ans
    const correct = ANSWER_KEY[i]
    const marks = marksForQuestion(i)
    const isCorrect = given === correct
    if (isCorrect) rawScore += marks
    const fast =
      !!(ans && typeof ans === 'object' && ans.fast) ||
      !!(sub.fastAnswers && sub.fastAnswers[i])
    if (fast) fastCount++
    details.push({
      id: i,
      qtext: QUESTION_TEXT[i] || '',
      given,
      correct,
      isCorrect,
      marks,
      fast,
    })
  }
  const bonus = fastCount > FAST_BONUS_THRESHOLD ? FAST_BONUS_MARKS : 0
  return { score: rawScore + bonus, rawScore, bonus, fastCount, details }
}
