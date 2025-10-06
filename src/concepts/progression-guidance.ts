import { GeminiLLM } from '../gemini-llm';
import { WorkoutSet } from './workout-log';

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

    const recommendation = this.parseRecommendation(response, exercise);
    this.recommendations.set(exercise, recommendation);
    
    return recommendation;
  }

  getRecommendation(exercise: string): Recommendation | null {
    return this.recommendations.get(exercise) || null;
  }

  private createRecommendationPrompt(exercise: string, sets: WorkoutSet[]): string {
    const setsSummary = sets.map(s => 
      `${s.date.toISOString().split('T')[0]}: ${s.weight}lbs × ${s.reps} reps`
    ).join('\n');

    return `You are an expert strength training coach analyzing workout progression data.

EXERCISE: ${exercise}

RECENT WORKOUT HISTORY (past 4 weeks):
${setsSummary}

ANALYSIS TASK:
1. Detect if there's a plateau (same weight/reps for 3+ sessions)
2. Recommend next workout parameters (weight and reps)
3. Provide evidence-based reasoning

PROGRESSION PRINCIPLES:
- If progressing well: suggest small weight increase (2.5-5lbs) or rep increase
- If plateaued: suggest deload (10-20% weight reduction) for 1-2 weeks
- If struggling/regressing: maintain or reduce intensity
- Consider fatigue indicators (rep drops within same weight)

Tone: Encouraging, direct, second-person ("You've been stuck at...", "I recommend you try...")

Return ONLY valid JSON:
{
  "suggestedWeight": number,
  "suggestedReps": number,
  "plateauDetected": boolean,
  "reasoning": "detailed explanation",
  "interventionStrategy": "deload/maintain/progress/variation"
}`;
  }

  private parseRecommendation(response: string, exercise: string): Recommendation {
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

    return {
      exercise,
      suggestedWeight: parsed.suggestedWeight,
      suggestedReps: parsed.suggestedReps,
      reasoning: parsed.reasoning || '',
      plateauDetected: parsed.plateauDetected,
      interventionStrategy: parsed.interventionStrategy
    };
  }
}