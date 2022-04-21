const { PrismaClient } = require('@prisma/client');
const makeHandledQuery = require('../../makeHandledQuery')
const prisma = new PrismaClient()
const { AuthenticationError } = require('apollo-server')

async function query({
  id,
  name,
  description,
  length,
  location,
  exercises=[],
  userId
}) {

  const originalWorkout = await prisma.workout.findFirst({
    where: {
      id: Number(id),
      userId
    }
  })

  if (!originalWorkout) throw new AuthenticationError('You are not authenticated. Please log in.')

  const updatedWorkout = await prisma.workout.update({
    where: {
      id: Number(id)
    },
    data: {
      name: name,
      description: description,
      length: length,
      location: location
    }
  })

  
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i]

    // upsert - updates exercise if one with id found
    // otherwise create exercise
    await prisma.exercise.upsert({
      where: { id: Number(exercise.id) || -1 },
      update: {
        name: exercise.name,
        reps: exercise.reps,
        sets: exercise.sets,
        weight: exercise.weight,
        unit: exercise.unit
      },
      create: {
        name: exercise.name,
        reps: exercise.reps,
        sets: exercise.sets,
        weight: exercise.weight,
        unit: exercise.unit,
        workoutId: Number(updatedWorkout.id)
      }
    })
  }

  const exsFromDb = await prisma.exercise.findMany({
    where: { workoutId: Number(updatedWorkout.id) }
  })

  // If an exercise in db is not found in exercise data from client
  // delete exercise
  for (let i = 0; i < exsFromDb.length; i++) {
    const exFromDbId = exsFromDb[i].id

    const exFound = exercises.map(ex => Number(ex.id)).includes(exFromDbId)

    if (!exFound) {
      await prisma.exercise.delete({
        where: { id: Number(exFromDbId) }
      })
    }
  }

  return updatedWorkout
}

const updateWorkout = makeHandledQuery(query)

module.exports = updateWorkout