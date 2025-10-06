import { WorkoutLog } from './concepts/workout-log';
import { ProgressionGuidance } from './concepts/progression-guidance';
import { GeminiLLM, Config } from './gemini-llm';

function loadConfig(): Config {
  try {
    return require('../config.json');
  } catch (error) {
    console.error('❌ Error loading config.json');
    process.exit(1);
  }
}

async function testPlateauDetection(): Promise<void> {
  console.log('\n🧪 TEST 1: Plateau Detection & Deload Recommendation');
  console.log('====================================================');
  
  const log = new WorkoutLog();
  const guidance = new ProgressionGuidance();
  const llm = new GeminiLLM(loadConfig());

  // Simulate 4 weeks of plateaued bench press
  const dates = [22, 25, 28, 1]; // Sept 22, 25, 28, Oct 1
  dates.forEach(day => {
    log.logSet('Bench Press', 185, 5);
    log.logSet('Bench Press', 185, 5);
    log.logSet('Bench Press', 185, 4); // Struggling on last set
  });

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

  // Simulate progressive overload success
  log.logSet('Squat', 225, 5);
  log.logSet('Squat', 225, 5);
  log.logSet('Squat', 225, 5);
  
  log.logSet('Squat', 230, 5);
  log.logSet('Squat', 230, 5);
  log.logSet('Squat', 230, 5);
  
  log.logSet('Squat', 235, 5);
  log.logSet('Squat', 235, 5);
  log.logSet('Squat', 235, 5);

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

async function main(): Promise<void> {
  console.log('🏋️ RepRight - AI Progression Guidance Tests\n');
  
  await testPlateauDetection();
  await testProgressingWell();
  await testInsufficientData();
  
  console.log('\n✅ All tests complete!');
}

main();