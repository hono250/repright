import { GeminiLLM } from '../gemini-llm';
import { WorkoutSet, WorkoutLog } from './workout-log';

export interface Recommendation {
  exercise: string;
  suggestedWeight: number;
  suggestedReps: number;
  reasoning: string;
  plateauDetected: boolean;
  interventionStrategy?: string;
}

export class ProgressionGuidance {
  private recommendations: Map<string, Recommendation> = new Map();

  async generateRecommendationLLM(
    exercise: string,
    recentSets: WorkoutSet[],
    llm: GeminiLLM
  ): Promise<Recommendation> {
    if (recentSets.length < 3) {
      throw new Error('Need at least 3 recent sets to generate recommendation');
    }

    const prompt = this.createRecommendationPrompt(exercise, recentSets);
    const response = await llm.executeLLM(prompt);
    
    console.log('\n🤖 RAW LLM RESPONSE:');
    console.log('====================');
    console.log(response);
    console.log('====================\n');

    const recommendation = this.parseRecommendation(response, exercise, recentSets);
    this.recommendations.set(exercise, recommendation);
    
    return recommendation;
  }

  getRecommendation(exercise: string): Recommendation | null {
    return this.recommendations.get(exercise) || null;
  }

  private createRecommendationPrompt(exercise: string, sets: WorkoutSet[]): string {
  return PromptVariants.contextAware(exercise, sets);
}

  private parseRecommendation(response: string, exercise: string, sets: WorkoutSet[]): Recommendation {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validators
    if (typeof parsed.suggestedWeight !== 'number' || parsed.suggestedWeight <= 0) {
      throw new Error('Invalid suggestedWeight');
    }
    if (typeof parsed.suggestedReps !== 'number' || parsed.suggestedReps <= 0) {
      throw new Error('Invalid suggestedReps');
    }
    if (typeof parsed.plateauDetected !== 'boolean') {
      throw new Error('Invalid plateauDetected');
    }

    const recommendation: Recommendation =  {
      exercise,
      suggestedWeight: parsed.suggestedWeight,
      suggestedReps: parsed.suggestedReps,
      reasoning: parsed.reasoning || '',
      plateauDetected: parsed.plateauDetected,
      interventionStrategy: parsed.interventionStrategy
    };
    // Added validators 
    this.validateRecommendation(recommendation, sets);

    return recommendation;
  }
  private validateRecommendation(rec: Recommendation, recentSets: WorkoutSet[]): void {
    const issues: string[] = [];

    // VALIDATOR 1: Suggested weight must be reasonable (not >20% change from recent average)
    const recentWeights = recentSets.slice(-6).map(s => s.weight);
    const avgWeight = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
    const percentChange = Math.abs((rec.suggestedWeight - avgWeight) / avgWeight) * 100;
    
    if (percentChange > 20) {
        issues.push(`Suggested weight (${rec.suggestedWeight}lbs) is ${percentChange.toFixed(1)}% different from recent average (${avgWeight.toFixed(1)}lbs). Max allowed: 20%.`);
    }

    // VALIDATOR 2: Reps must be in reasonable range (1-20 for most exercises)
    if (rec.suggestedReps < 1 || rec.suggestedReps > 20) {
        issues.push(`Suggested reps (${rec.suggestedReps}) outside reasonable range (1-20).`);
    }

    // VALIDATOR 3: If plateau detected, intervention strategy must be appropriate
    if (rec.plateauDetected === true) {
        const validStrategies = ['deload', 'maintain', 'variation'];
        const strategy = rec.interventionStrategy?.toLowerCase() || '';
        
        if (!validStrategies.some(s => strategy.includes(s))) {
        issues.push(`Plateau detected but intervention strategy "${rec.interventionStrategy}" is not deload/maintain/variation.`);
        }
    }

    if (issues.length > 0) {
        throw new Error(`LLM recommendation validation failed:\n- ${issues.join('\n- ')}`);
    }
}
}

export class PromptVariants {
  
  // ORIGINAL PROMPT
  static original(exercise: string, sets: WorkoutSet[]): string {
    const setsSummary = sets.map(s => 
      `${s.date.toISOString().split('T')[0]}: ${s.weight}lbs × ${s.reps} reps`
    ).join('\n');

    return `You are an expert strength training coach providing personalized advice to an athlete.

EXERCISE: ${exercise}

YOUR RECENT WORKOUT HISTORY (past 4 weeks):
${setsSummary}

ANALYSIS TASK:
Analyze the data and provide a recommendation speaking directly to the athlete using "you/your".

PROGRESSION PRINCIPLES:
- If progressing well: suggest small weight increase (2.5-5lbs) or rep increase
- If plateaued: suggest deload (10-20% weight reduction) for 1-2 weeks
- If struggling/regressing: maintain or reduce intensity
- Consider fatigue indicators (rep drops within same weight)

TONE: Encouraging, direct, second-person ("You've been stuck at...", "I recommend you try...")

Return ONLY valid JSON:
{
  "suggestedWeight": number,
  "suggestedReps": number,
  "plateauDetected": boolean,
  "reasoning": "speak directly to the athlete using 'you'",
  "interventionStrategy": "deload/maintain/progress/variation"
}`;
  }

  // VARIANT 1: Strict plateau definition - requires 3+ DIFFERENT DATES
  static strictPlateau(exercise: string, sets: WorkoutSet[]): string {
    const setsSummary = sets.map(s => 
      `${s.date.toISOString().split('T')[0]}: ${s.weight}lbs × ${s.reps} reps`
    ).join('\n');

    return `You are an expert strength training coach providing personalized advice.

EXERCISE: ${exercise}

YOUR RECENT WORKOUT HISTORY:
${setsSummary}

STRICT PLATEAU DEFINITION:
- TRUE PLATEAU: Same weight AND similar reps across 3+ DIFFERENT workout dates
- NORMAL INTRA-WORKOUT FATIGUE: Rep drops within ONE date (12→11→10) - NOT a plateau
- SMART ADJUSTMENT: Reducing weight after a failed attempt is good training, not plateau
- MINIMUM DATA: If all sets are from 1-2 dates only, DO NOT mark as plateau

RULES:
1. Count unique workout dates in the data
2. If <3 different dates: plateauDetected MUST be false
3. If 3+ dates with same weight: check if it's truly stuck or progressing

TONE: Encouraging, direct, second-person ("You've been stuck at...", "I recommend you try...")

Return ONLY valid JSON:
{
  "suggestedWeight": number,
  "suggestedReps": number,
  "plateauDetected": boolean,
  "reasoning": "explain your date-based analysis",
  "interventionStrategy": "deload/maintain/progress/variation"
}`;
  }

  // VARIANT 2: Injury risk detection for rapid progression
  static safetyFocused(exercise: string, sets: WorkoutSet[]): string {
    const setsSummary = sets.map(s => 
      `${s.date.toISOString().split('T')[0]}: ${s.weight}lbs × ${s.reps} reps`
    ).join('\n');

    return `You are a strength coach focused on LONG-TERM sustainable progress and injury prevention.

EXERCISE: ${exercise}

YOUR RECENT WORKOUT HISTORY:
${setsSummary}

INJURY RISK ASSESSMENT:
- Calculate weight increase per week between sessions
- RED FLAG: >10% weekly increase = high injury risk
- RED FLAG: Consistent rep failures (5→3→2) = overtraining
- For dangerous progressions: STRONGLY warn in reasoning and recommend aggressive deload

SAFETY-FIRST RULES:
1. If weekly jumps >10%: mark plateauDetected=true, recommend 15-20% deload, WARN about injury
2. If rep failures across sessions: immediate deload
3. Conservative progression: 2.5-5lbs increase only if completing all reps cleanly

TONE: Encouraging, direct, second-person ("You've been stuck at...", "I recommend you try...")

Return ONLY valid JSON with EXPLICIT safety warnings if needed:
{
  "suggestedWeight": number,
  "suggestedReps": number,
  "plateauDetected": boolean,
  "reasoning": "MUST include injury risk warning if detected",
  "interventionStrategy": "deload/maintain/progress/variation"
}`;
  }

  // VARIANT 3: Context-aware with exercise-specific guidance
  static contextAware(exercise: string, sets: WorkoutSet[]): string {
    const setsSummary = sets.map(s => 
      `${s.date.toISOString().split('T')[0]}: ${s.weight}lbs × ${s.reps} reps`
    ).join('\n');


    return `You are an expert strength coach with deep exercise-specific knowledge.

EXERCISE: ${exercise}

YOUR RECENT WORKOUT HISTORY:
${setsSummary}

CONTEXT-AWARE ANALYSIS:
- Use your knowledge of this exercise to determine appropriate progression rates
- Consider whether this is a compound or isolation movement
- Account for typical fatigue patterns in this exercise
- Rep drops within a single session are normal - don't confuse with plateau

TONE: Encouraging, direct, second-person ("You've been stuck at...", "I recommend you try...")

Return ONLY valid JSON:
{
  "suggestedWeight": number,
  "suggestedReps": number,
  "plateauDetected": boolean,
  "reasoning": "use exercise-specific context in your analysis",
  "interventionStrategy": "deload/maintain/progress/variation"
}`;
  }
}

