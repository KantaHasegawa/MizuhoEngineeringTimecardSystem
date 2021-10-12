import request from 'supertest'
import app from '../src/app'

describe('Root request', () => {
  // test('Add todos', async () => {
  //   return request(app)
  //     .post('/api/v1')
  //     .send({
  //       username: 'user3',
  //       title: 'title3',
  //     })
  //     .then((res) => {
  //       expect(res.status).toBe(200)
  //     })
  // })

  test('get root path', async () => {
    return request(app)
      .get("/api/v1")
      .then((res) => {
        expect(res.status).toBe(200)
      })
  })
})
