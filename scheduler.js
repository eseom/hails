const kue = require('kue-scheduler')

const getScheduler = (config) => {
  const redis = config.scheduler.broker.redis
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

  // make scheduler
  const scheduler = {
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

  return scheduler
}

module.exports = {
  getScheduler,
}
