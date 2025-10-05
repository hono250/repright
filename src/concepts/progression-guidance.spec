concept ProgressionGuidance [User, Exercise]

purpose provide intelligent recommendations for workout progression

principle
  after analyzing workout history patterns,
  system suggests next workout parameters to optimize progress

state
  a set of Recommendations with
    a user User
    an exercise Exercise
    a suggestedWeight Number
    a suggestedReps Number
    a reasoning String

actions
  generateRecommendation (user: User, exercise: Exercise, recentSets: set of WorkoutSet): (recommendation: Recommendation)
    requires recentSets contains at least 3 sets from past 4 weeks
    effects analyze performance patterns and create recommendation
      if user completed all prescribed reps easily, suggest weight increase
      if user struggled with current weight, suggest maintaining or reducing

  getRecommendation (user: User, exercise: Exercise): (weight: Number, reps: Number, reasoning: String)
    requires recommendation exists for this user and exercise
    effects return most recent recommendation

  detectPlateau (user: User, exercise: Exercise, historicalSets: set of WorkoutSet): (isPlateaued: Boolean)
    requires historicalSets spans at least 3 weeks
    effects return true if no improvement in weight or reps for 3+ consecutive workouts


AI-AUGMENTED VERSION:

concept ProgressionGuidance [User, Exercise]

purpose provide intelligent LLM-powered recommendations for workout progression

principle
  after analyzing workout history patterns with LLM,
  system generates nuanced, context-aware suggestions for progression

state
  a set of Recommendations with
    a user User
    an exercise Exercise
    a suggestedWeight Number
    a suggestedReps Number
    a reasoning String
    a plateauDetected Boolean
    a interventionStrategy String (optional)

actions
  async generateRecommendationLLM (user: User, exercise: Exercise, recentSets: set of WorkoutSet, llm: GeminiLLM): (recommendation: Recommendation)
    requires recentSets contains at least 3 sets
    effects uses LLM to analyze patterns (volume trends, fatigue indicators, progression velocity) and generate recommendation with reasoning

  getRecommendation (user: User, exercise: Exercise): (recommendation: Recommendation)
    requires recommendation exists for this user and exercise
    effects return most recent recommendation

  async detectPlateauLLM (user: User, exercise: Exercise, historicalSets: set of WorkoutSet, llm: GeminiLLM): (isPlateaued: Boolean, intervention: String)
    requires historicalSets spans at least 3 weeks
    effects uses LLM to detect plateau and suggest evidence-based interventions (deload, volume changes, variations)