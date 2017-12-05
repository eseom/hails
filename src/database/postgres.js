import pg from 'pg'

// Cannot find module 'pg-native'
// https://github.com/sequelize/sequelize/issues/3781

delete pg.native

// https://github.com/sequelize/sequelize/issues/4550
pg.defaults.parseInt8 = true

// https://github.com/sequelize/sequelize/issues/3768#issuecomment-105055775
pg.types.setTypeParser(1114, (stringValue) => {
  let suffix = ''
  if (stringValue.indexOf('.') === -1) {
    suffix = '.001' // sequelize bug without miliseconds
  }
  return new Date(`${stringValue}${suffix}UTC`)
})
