concept WorkoutLog [User, Exercise]

purpose track workout performance over time

principle 
  after logging sets with exercise, weight, and reps,
  users can retrieve their workout history to see past performance

state
  a set of WorkoutSets with
    a user User
    an exercise Exercise
    a weight Number
    a reps Number
    a date Date

actions
  logSet (user: User, exercise: Exercise, weight: Number, reps: Number)
    requires weight >= 0 and reps > 0
    effects create new WorkoutSet with current date

  getLastWorkout (user: User, exercise: Exercise): (weight: Number, reps: Number, date: Date)
    requires at least one workout exists for this user and exercise
    effects return most recent set for this exercise 

  getWorkoutHistory (user: User, exercise: Exercise, startDate: Date, endDate: Date): (sets: set of WorkoutSet)
    requires startDate is before end date 
    effects return all sets for this exercise within the date range