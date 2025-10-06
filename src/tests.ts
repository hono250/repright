import { WorkoutLog } from './concepts/workout-log';
import { ProgressionGuidance, PromptVariants } from './concepts/progression-guidance';
import { GeminiLLM, Config } from './gemini-llm';

function loadConfig(): Config {
  try {
    return require('../config.json');
  } catch (error) {
    console.error('❌ Error loading config.json');
    process.exit(1);
  }
}

// simple test cases

async function testPlateauDetection(): Promise<void> {
  console.log('\n🧪 TEST 1: Plateau Detection & Deload Recommendation');
  console.log('====================================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  // 4 separate workout dates, all stuck at 185lbs
  log.logSet('Bench Press', 185, 5, 22); // 22 days ago
  log.logSet('Bench Press', 185, 5, 22);
  log.logSet('Bench Press', 185, 4, 22);
  
  log.logSet('Bench Press', 185, 5, 15); // 15 days ago
  log.logSet('Bench Press', 185, 5, 15);
  log.logSet('Bench Press', 185, 4, 15);
  
  log.logSet('Bench Press', 185, 5, 8); // 8 days ago
  log.logSet('Bench Press', 185, 5, 8);
  log.logSet('Bench Press', 185, 4, 8);
  
  log.logSet('Bench Press', 185, 5, 1); // 1 day ago
  log.logSet('Bench Press', 185, 5, 1);
  log.logSet('Bench Press', 185, 4, 1);

  const history = log.getHistory('Bench Press');
  console.log(`📊 Logged ${history.length} sets over 4 weeks`);
  
  const rec = await guidance.generateRecommendationLLM('Bench Press', history, llm);
  
  console.log('\n✅ RECOMMENDATION:');
  console.log(`Weight: ${rec.suggestedWeight}lbs`);
  console.log(`Reps: ${rec.suggestedReps}`);
  console.log(`Plateau: ${rec.plateauDetected}`);
  console.log(`Strategy: ${rec.interventionStrategy}`);
  console.log(`Reasoning: ${rec.reasoning}`);
}

async function testProgressingWell(): Promise<void> {
  console.log('\n🧪 TEST 2: Progressing Well - Suggest Increase');
  console.log('===============================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

 // 3 separate sessions, progressive overload
  log.logSet('Squat', 225, 5, 14);
  log.logSet('Squat', 225, 5, 14);
  log.logSet('Squat', 225, 5, 14);
  
  log.logSet('Squat', 230, 5, 7);
  log.logSet('Squat', 230, 5, 7);
  log.logSet('Squat', 230, 5, 7);
  
  log.logSet('Squat', 235, 5, 0);
  log.logSet('Squat', 235, 5, 0);
  log.logSet('Squat', 235, 5, 0);

  const history = log.getHistory('Squat');
  const rec = await guidance.generateRecommendationLLM('Squat', history, llm);
  
  console.log('\n✅ RECOMMENDATION:');
  console.log(`Weight: ${rec.suggestedWeight}lbs`);
  console.log(`Reps: ${rec.suggestedReps}`);
  console.log(`Plateau: ${rec.plateauDetected}`);
  console.log(`Reasoning: ${rec.reasoning}`);
}

async function testInsufficientData(): Promise<void> {
  console.log('\n🧪 TEST 3: Insufficient Data Error Handling');
  console.log('===========================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  log.logSet('Deadlift', 315, 3);
  log.logSet('Deadlift', 315, 3);

  try {
    await guidance.generateRecommendationLLM('Deadlift', log.getHistory('Deadlift'), llm);
  } catch (error) {
    console.log('✅ Correctly caught error:', (error as Error).message);
  }
}


//Advanced test cases

// SCENARIO 1: Inconsistent data with gaps
async function testInconsistentData(): Promise<void> {
  console.log('\n🧪 SCENARIO 1: Inconsistent Training (Gaps & Variation)');
  console.log('======================================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  // 21 days ago
  log.logSet('Overhead Press', 95, 8, 21);
  log.logSet('Overhead Press', 95, 7, 21);
  log.logSet('Overhead Press', 95, 8, 21);
  
  // 11 days ago (10-day gap)
  log.logSet('Overhead Press', 100, 5, 11);
  log.logSet('Overhead Press', 100, 4, 11);
  log.logSet('Overhead Press', 100, 3, 11);
  
  // 8 days ago (backed off after failure)
  log.logSet('Overhead Press', 95, 8, 8);
  log.logSet('Overhead Press', 95, 8, 8);
  log.logSet('Overhead Press', 95, 7, 8);

  const history = log.getHistory('Overhead Press');
  const rec = await guidance.generateRecommendationLLM('Overhead Press', history, llm);
  
  console.log('\nRECOMMENDATION:', rec);
}

// SCENARIO 2: Super rapid progression
async function testRapidProgression(): Promise<void> {
  console.log('\n🧪 SCENARIO 2: Rapid Progression (Injury Risk)');
  console.log('==============================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  // Dangerous weekly 20lb jumps
  log.logSet('Deadlift', 225, 5, 21);
  log.logSet('Deadlift', 225, 5, 21);
  
  log.logSet('Deadlift', 245, 5, 14);
  log.logSet('Deadlift', 245, 5, 14);
  
  log.logSet('Deadlift', 265, 5, 7);
  log.logSet('Deadlift', 265, 4, 7);
  
  log.logSet('Deadlift', 285, 3, 0);
  log.logSet('Deadlift', 285, 2, 0);

  const history = log.getHistory('Deadlift');
  const rec = await guidance.generateRecommendationLLM('Deadlift', history, llm);
  
  console.log('\nRECOMMENDATION:', rec);
}

// SCENARIO 3: Minimal data (edge case)
async function testMinimalData(): Promise<void> {
  console.log('\n🧪 SCENARIO 3: Exactly 3 Sets (Minimum Data)');
  console.log('============================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  log.logSet('Dumbbell Curl', 30, 12);
  log.logSet('Dumbbell Curl', 30, 11);
  log.logSet('Dumbbell Curl', 30, 10);

  const history = log.getHistory('Dumbbell Curl');
  const rec = await guidance.generateRecommendationLLM('Dumbbell Curl', history, llm);
  
  console.log('\nRECOMMENDATION:', rec);
}


// Tests for prompt variants
async function testPromptVariants(): Promise<void> {
  console.log('\n🧪 TESTING PROMPT VARIANTS AGAINST ALL SCENARIOS');
  console.log('=================================================\n');
  
  const llm = new GeminiLLM(loadConfig());
  
  // Scenario 1: Inconsistent data (should recognize smart weight adjustment, not plateau)
  const scenario1 = new WorkoutLog();
  scenario1.logSet('Overhead Press', 95, 8, 21);
  scenario1.logSet('Overhead Press', 95, 7, 21);
  scenario1.logSet('Overhead Press', 100, 5, 11);
  scenario1.logSet('Overhead Press', 100, 4, 11);
  scenario1.logSet('Overhead Press', 95, 8, 8);
  scenario1.logSet('Overhead Press', 95, 7, 8);
  
  // Scenario 2: Rapid progression (should warn about injury risk)
  const scenario2 = new WorkoutLog();
  scenario2.logSet('Deadlift', 225, 5, 21);
  scenario2.logSet('Deadlift', 245, 5, 14);
  scenario2.logSet('Deadlift', 265, 5, 7);
  scenario2.logSet('Deadlift', 285, 3, 0);
  scenario2.logSet('Deadlift', 285, 2, 0);
  
  // Scenario 3: Single workout (should NOT detect plateau)
  const scenario3Sets = [
    { exercise: 'Dumbbell Curl', weight: 30, reps: 12, date: new Date() },
    { exercise: 'Dumbbell Curl', weight: 30, reps: 11, date: new Date() },
    { exercise: 'Dumbbell Curl', weight: 30, reps: 10, date: new Date() }
  ];

  const variants = [
    { name: 'ORIGINAL', fn: PromptVariants.original },
    { name: 'STRICT PLATEAU', fn: PromptVariants.strictPlateau },
    { name: 'SAFETY FOCUSED', fn: PromptVariants.safetyFocused },
    { name: 'CONTEXT AWARE', fn: PromptVariants.contextAware }
  ];

  for (const variant of variants) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${variant.name}`);
    console.log('='.repeat(60));

    console.log('\n--- Scenario 1: Inconsistent Training ---');
    const p1 = variant.fn('Overhead Press', scenario1.getHistory('Overhead Press'));
    const r1 = await llm.executeLLM(p1);
    console.log(r1);

    console.log('\n--- Scenario 2: Rapid Progression ---');
    const p2 = variant.fn('Deadlift', scenario2.getHistory('Deadlift'));
    const r2 = await llm.executeLLM(p2);
    console.log(r2);

    console.log('\n--- Scenario 3: Single Workout ---');
    const p3 = variant.fn('Dumbbell Curl', scenario3Sets);
    const r3 = await llm.executeLLM(p3);
    console.log(r3);
  }
}

async function main(): Promise<void> {
  console.log('🏋️ RepRight - AI Progression Guidance Tests\n');
  
//   // Basic tests
//   await testPlateauDetection();
//   await testProgressingWell();
//   await testInsufficientData();
  
//   // Advanced scenarios
//   await testInconsistentData();
//   await testRapidProgression();
//   await testMinimalData();

//Testing advanced scenarios on all prompt variants. 
await testPromptVariants();
  
  console.log('\n✅ All tests complete!');
}
main();