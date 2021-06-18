import {
  createInteractionContext,
  createConnectionObject,
  InteractionContext
} from '@src/Connection'

describe('Connection', () => {
  describe('createConnectionObject', () => {
    it('can be passed undefined', () => {
      expect(createConnectionObject(undefined)).toStrictEqual({
        host: 'localhost',
        port: 1337,
        tls: false,
        address: {
          webSocket: 'ws://localhost:1337'
        }
      })
    })
    it('can be passed a complete ConnectionConfig object', () => {
      expect(createConnectionObject({
        host: 'some-host',
        port: 1338,
        tls: true
      })).toStrictEqual({
        host: 'some-host',
        port: 1338,
        tls: true,
        address: {
          webSocket: 'wss://some-host:1338'
        }
      })
    })
    it('can be passed an object with just a host', () => {
      expect(createConnectionObject({
        host: 'some-host'
      })).toStrictEqual({
        host: 'some-host',
        port: 1337,
        tls: false,
        address: {
          webSocket: 'ws://some-host:1337'
        }
      })
    })
    it('can be passed an object with just a port', () => {
      expect(createConnectionObject({
        port: 1338
      })).toStrictEqual({
        host: 'localhost',
        port: 1338,
        tls: false,
        address: {
          webSocket: 'ws://localhost:1338'
        }
      })
    })
    it('can be passed an object with just tls', () => {
      expect(createConnectionObject({
        tls: true
      })).toStrictEqual({
        host: 'localhost',
        port: 1337,
        tls: true,
        address: {
          webSocket: 'wss://localhost:1337'
        }
      })
    })
    it('can be passed an object excluding a host', () => {
      expect(createConnectionObject({
        port: 1338,
        tls: true
      })).toStrictEqual({
        host: 'localhost',
        port: 1338,
        tls: true,
        address: {
          webSocket: 'wss://localhost:1338'
        }
      })
    })
    it('can be passed an object excluding a port', () => {
      expect(createConnectionObject({
        host: 'localhost',
        tls: true
      })).toStrictEqual({
        host: 'localhost',
        port: 1337,
        tls: true,
        address: {
          webSocket: 'wss://localhost:1337'
        }
      })
    })
    it('can be passed an object excluding tls', () => {
      expect(createConnectionObject({
        host: 'localhost',
        port: 1338
      })).toStrictEqual({
        host: 'localhost',
        port: 1338,
        tls: false,
        address: {
          webSocket: 'ws://localhost:1338'
        }
      })
    })
  })
  describe('InteractionContext', () => {
    it('rejects with the Websocket errors on failed connection', async () => {
      let context: InteractionContext
      try {
        context = await createInteractionContext(
          (error) => console.error(error),
          { connection: { host: 'non-existent-host', port: 1111 } }
        )
        expect(context).toBeUndefined()
        if (context.socket.readyState === context.socket.OPEN) {
          await context.socket.close()
        }
      } catch (error) {
        expect(error.code).toMatch(/EAI_AGAIN|ENOTFOUND/)
      }
      try {
        context = await createInteractionContext(
          (error) => console.error(error),
          { connection: { port: 1111 } }
        )
        expect(context).toBeUndefined()
        if (context.socket.readyState === context.socket.OPEN) {
          await context.socket.close()
        }
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED')
      }
    })
  })
})