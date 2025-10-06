export interface WorkoutSet {
  exercise: string;
  weight: number;
  reps: number;
  date: Date;
}

export class WorkoutLog {
  private sets: WorkoutSet[] = [];

  logSet(exercise: string, weight: number, reps: number, daysAgo: number = 0): void {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    this.sets.push({
      exercise,
      weight,
      reps,
      date: new Date()
    });
  }

  getHistory(exercise: string, weeksBack: number = 4): WorkoutSet[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));
    
    return this.sets.filter(set => 
      set.exercise === exercise && set.date >= cutoffDate
    );
  }

  getLastWorkout(exercise: string): WorkoutSet | null {
    const exerciseSets = this.sets.filter(s => s.exercise === exercise);
    return exerciseSets.length > 0 ? exerciseSets[exerciseSets.length - 1] : null;
  }
}