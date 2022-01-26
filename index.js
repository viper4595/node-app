const Express = require('express')
const Keycloak = require('keycloak-connect')

const util = require('util')
const request = require('request')

const post = util.promisify(request.post)

// keycloak config
const config = {
  serverUrl: 'http://localhost:8080/auth',
  realm: 'demo',
  clientId: 'node-app',
  credentials: {
    secret: '7e34be64-c1e3-4e43-9126-cead62c873ff'
  }
}

const keycloak = new Keycloak({}, config)

// utils
const getKeyCloakToken = (username, password) => {
  return post({
    baseUrl: `${config.serverUrl}/realms/${config.realm}`,
    url: '/protocol/openid-connect/token',
    form: {
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.credentials.secret,
      username,
      password
    }
  })
}

// express app
const app = Express()

// middleware
app.use(keycloak.middleware())

// routes
app.get('/get-customer', keycloak.enforcer('customer:read'), (req, res, next) => {
  res.status(200).json({ ok: true, message: 'get customer success' })
})

app.post('/create-customer', keycloak.enforcer('customer:create'), (req, res, next) => {
  res.status(200).json({ ok: true, message: 'create customer success' })
})

app.listen(3000, async () => {
  console.log('App listen on port:', 3000)

  const adminData = await getKeyCloakToken('user.admin', '123456')
  const adminToken = await JSON.parse(adminData.body).access_token

  const userData = await getKeyCloakToken('user.user', '123456')
  const userToken = await JSON.parse(userData.body).access_token

  // test-cases
  request.get(
    `http://localhost:3000/get-customer`,
    { headers: { authorization: 'Bearer ' + adminToken } },
    (err, res) => {
      console.log('-------------------------')

      console.log('Admin user read customer')
      console.log('GET http://localhost:3000/get-customer', res.statusCode)
    }
  )

  request.get(
    `http://localhost:3000/get-customer`,
    { headers: { authorization: 'Bearer ' + userToken } },
    (err, res) => {
      console.log('-------------------------')

      console.log('Normal user read customer')
      console.log('GET http://localhost:3000/get-customer', res.statusCode)
    }
  )

  request.post(
    `http://localhost:3000/create-customer`,
    { headers: { authorization: 'Bearer ' + adminToken } },
    (err, res) => {
      console.log('-------------------------')

      console.log('Admin user create customer')
      console.log('POST http://localhost:3000/create-customer', res.statusCode)
    }
  )

  request.post(
    `http://localhost:3000/create-customer`,
    { headers: { authorization: 'Bearer ' + userToken } },
    (err, res) => {
      console.log('-------------------------')

      console.log('Normal user create customer')
      console.log('POST http://localhost:3000/get-customer', res.statusCode)
    }
  )
})
