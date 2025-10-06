# Repright

## User Interactions

### UI Sketches - (for concept: ProgressionGuidance)
![Image](https://github.com/user-attachments/assets/3c47ac4b-6890-4ed2-a997-e8d3c3ea6679)

### User Journey - (for concept: ProgressionGuidance)
Yannick has been stuck at 185lbs bench press for four weeks. He opens Repright and navigates to the Exercise History screen for the workout and taps "Get AI Recommendation." The system sends his past 4 weeks of workout data to the LLM, which analyzes the plateau pattern and returns a recommendation to deload to 155lbs with detailed reasoning about recovery and progression. Yannick reviews the AI's explanation, taps "Apply," and his next workout session is pre-filled with the recommended weight and reps, allowing him to execute the deload strategy immediately.

## Prompt Experimentation

3 scenarios 
- **Scenario 1**: Inconsistent data with gaps (should recognize smart weight adjustment, not plateau)
- **Scenario 2**: Very rapid progression (should warn about injury risk)
- **Scenario 3**: Single workout (should NOT detect plateau)

### Experiment 1: Original Prompt

**Approach**: Basic prompt with general progression principles and second-person tone. Instructs LLM to detect plateaus and recommend deload/progress/maintain strategies.

**What worked**: Generated human-friendly, encouraging recommendations with clear reasoning.

**What went wrong**:

- False positive on Scenario 3: flagged single-workout fatigue (12→11→10 reps) as plateau
- Scenario 1: misinterpreted smart weight adjustment (backing off from 100→95 after failure) as needing deload
- Scenario 2: didn't recognize or warn about dangerous 20lb weekly jumps

**Issues remaining**: Too quick to recommend deloads; lacks clear definition of what constitutes a true plateau vs normal training patterns.

### Experiment 2: Strict Plateau Definition

**Approach**: Added explicit rule requiring 3+ different workout dates with same weight/reps to flag plateau. Emphasized distinguishing between intra-workout fatigue and multi-session stagnation.

**What worked**: Correctly identified that single-workout data (Scenario 3) cannot indicate plateau.

**What went wrong**: Test data bug caused all scenarios to appear as single dates, making it impossible to properly evaluate multi-session plateau detection.

**Issues remaining**: Needs properly spaced test data to validate effectiveness. May be too strict for real-world use where users train 2-3x/week.

### Experiment 3: Safety-Focused

**Approach**: Prioritized injury prevention by checking for >10% weekly weight increases and consecutive rep failures. Emphasized aggressive deloading for overtraining signals.

**What worked**: Correctly identified overtraining risk in Scenario 2 with rep failures at 285lbs.

**What went wrong**:

- Still flagged Scenario 3 as plateau despite single-session data
- Too conservative overall—recommended deloads even when progression was reasonable

**Issues remaining**: Overly cautious approach may demotivate users who are training appropriately.

### Experiment 4: Context-Aware (Selected)

**Approach**: Leveraged LLM's inherent knowledge of exercise biomechanics. Emphasized not confusing single-session fatigue with plateau and trusting model to apply exercise-specific progression rates.

**What worked**:

Correctly handled all three scenarios

- Recognized 12→10 rep drop as normal fatigue, not plateau (Scenario 3)
- Understood 100→95 adjustment as smart training (Scenario 1)
- Suggested appropriate progression to prevent injury (Scenario 2)

**What went wrong**: Nothing major in these tests.

**Issues remaining**: Performance depends heavily on LLM's training data quality regarding exercise science. May need fallback logic for edge cases or obscure exercises.

## Validators 

Three possible LLM failures and their corresponding validators: 

1. **Extreme weight hallucinations** - The LLM might suggest 300lbs when the user works with 185lbs, or 50lbs when at 225lbs. Validator checks that suggested weight stays within 20% of recent 6-set average.
2. **Invalid rep ranges** - The LLM could recommend 0 reps, negative values, or unrealistic 50+ rep sets. Validator enforces 1-20 rep range covering all strength training protocols.
3. **Plateau-strategy contradiction** - The LLM might detect a plateau but still recommend "progress" as the intervention. Validator ensures that when plateauDetected is true, the interventionStrategy must be "deload", "maintain", or "variation" - never "progress".
  
All validators throw descriptive errors when violations occur, implemented in validateRecommendation() within progression-guidance.ts.




