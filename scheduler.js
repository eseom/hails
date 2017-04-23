const kue = require('kue-scheduler')

const getScheduler = (config) => {
  const redis = config.redis.url
  const jobs = kue.createQueue({
    redis,
  })

  // get schedules from config
  let schedules = []
  try {
    schedules = config.schedules
  } catch (e) {
    schedules = []
  }
  schedules = schedules || []

  // make schedule
  const schedule = {
    register(name, callback) {
      return jobs.process(name, 10, callback)
    },
    now(name, options) {
      return jobs.createJob(name, options)
        .removeOnComplete(true)
        .delay(0)
        .save()
    },
  }

  // initialize
  jobs.clear((err, response) => {
    schedules.forEach((sche) => {
      const job = jobs.createJob(sche[1], {})
        .removeOnComplete(true)
        .unique(sche[1])
      jobs.every(sche[0], job)
    })
  })

  return schedule
}

module.exports = {
  getScheduler,
}
