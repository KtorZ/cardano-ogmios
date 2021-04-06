import {
  createStateQueryClient,
  currentEpoch,
  currentProtocolParameters, delegationsAndRewards,
  eraStart,
  genesisConfig,
  ledgerTip,
  nonMyopicMemberRewards,
  proposedProtocolParameters,
  stakeDistribution, StateQueryClient,
  utxo
} from '@src/StateQuery'
import {
  Hash16,
  Slot
} from '@cardano-ogmios/schema'

const connection = { port: 1338 }

describe('Local state queries', () => {
  describe('StateQueryClient', () => {
    it('rejects with the Websocket errors on failed connection', async () => {
      let client: StateQueryClient
      try {
        client = await createStateQueryClient(
          { connection: { host: 'non-existent-host', port: 1111 } }
        )
        expect(client).toBeUndefined()
        if (client.context.socket?.readyState === client.context.socket.OPEN) {
          await client.release()
        }
      } catch (error) {
        expect(error.code).toBe('EAI_AGAIN')
      }
      try {
        client = await createStateQueryClient(
          { connection: { port: 1111 } }
        )
        expect(client).toBeUndefined()
        if (client.context.socket?.readyState === client.context.socket.OPEN) {
          await client.release()
        }
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED')
      }
    })

    it('returns the interaction context', async () => {
      const client = await createStateQueryClient({ connection })
      expect(client.context.connectionString).toBe('ws://localhost:1338')
      expect(client.context.socket.readyState).toBe(client.context.socket.OPEN)
      await client.release()
    })

    it('gets the point from the tip if none provided', async () => {
      const client = await createStateQueryClient({ connection })
      const { point } = client
      expect(point).toBeDefined()
      await client.release()
    })

    it('uses the provided point for reproducible queries across clients', async () => {
      const client = await createStateQueryClient({ connection })
      const anotherClient = await createStateQueryClient({ connection, point: client.point })
      expect(anotherClient.point).toEqual(client.point)
      await client.release()
      await anotherClient.release()
    })

    it('rejects if the provided point is too old', async () => {
      const createWithOldPoint = async () => {
        await createStateQueryClient({
          connection,
          point: 'origin'
        })
      }
      await expect(createWithOldPoint).rejects
    })

    it('rejects method calls after release', async () => {
      const client = await createStateQueryClient({ connection })
      await client.release()
      const run = () => client.currentEpoch()
      await expect(run).rejects
    })

    describe('calling queries from the client', () => {
      it('exposes the queries, uses a single context, and should be released when done', async () => {
        const client = await createStateQueryClient({ connection })

        const epoch = await client.currentEpoch()
        expect(epoch).toBeDefined()

        const protocolParameters = await client.currentProtocolParameters()
        expect(protocolParameters.protocolVersion.major).toBeDefined()

        const delegationsAndRewardsResult = await client.delegationsAndRewards(
          ['e07bb8d7762ebb0f7340c03e69b3b1aa253dab7ba3c62ebbd50781423a']
        )
        expect(Object.keys(delegationsAndRewardsResult).length).toBe(1)

        const bound = await client.eraStart()
        expect(bound.slot).toBeDefined()

        const compactGenesis = await client.genesisConfig()
        expect(compactGenesis.systemStart).toBeDefined()

        const point = await client.ledgerTip() as { slot: Slot, hash: Hash16 }
        expect(point.slot).toBeDefined()

        const rewards = await client.nonMyopicMemberRewards([10000])
        expect(
          Object.values(Object.values(rewards)[0])[0]
        ).toBeDefined()

        const proposedProtocolParameters = await client.proposedProtocolParameters()
        expect(Object.values(proposedProtocolParameters)[0].minUtxoValue).toBeDefined()

        const stakeDistribution = await client.stakeDistribution()
        expect(Object.values(stakeDistribution)[0].stake).toBeDefined()

        const utxoSet = await client.utxo(['addr1v9f9pvusgs840v80dgl83humjsda6ynygsgdsjlggxknt8g92v6ap'])
        expect(utxoSet[0]).toBeDefined()

        await client.release()
      })
    })
  })

  describe('Queries', () => {
    describe('currentEpoch', () => {
      it('fetches the current epoch number', async () => {
        const epoch = await currentEpoch({ connection })
        expect(epoch).toBeDefined()
      })
    })
    describe('currentProtocolParameters', () => {
      it('fetches the current shelley protocol parameters', async () => {
        const protocolParameters = await currentProtocolParameters({ connection })
        expect(protocolParameters.minFeeCoefficient).toBeDefined()
        expect(protocolParameters.protocolVersion.major).toBeDefined()
      })
    })
    describe('delegationsAndRewards', () => {
      it('fetches the current delegate and rewards for given stake key hashes', async () => {
        const stakeKeyHashes = ['0a4fa22c44a2ac1505e34ff15436a06b9de36970af974916d5829be0'] as Hash16[]
        const result = await delegationsAndRewards(stakeKeyHashes, { connection })
        const item = result[stakeKeyHashes[0]]
        expect(item.delegate).toHaveProperty(['delegate', 'rewards'])
      })
    })
    describe('eraStart', () => {
      it('fetches the bound of the current era', async () => {
        const bound = await eraStart({ connection })
        expect(bound.time).toBeDefined()
        expect(bound.slot).toBeDefined()
        expect(bound.epoch).toBeDefined()
      })
    })
    describe('genesisConfig', () => {
      it('fetches the config used to bootstrap the blockchain, excluding the genesis UTXO', async () => {
        const config = await genesisConfig({ connection })
        expect(config.systemStart).toBeDefined()
        expect(config.networkMagic).toBeDefined()
      })
    })
    describe('ledgerTip', () => {
      it('fetches the tip of the ledger', async () => {
        const point = await ledgerTip({ connection }) as { slot: Slot, hash: Hash16 }
        expect(point.hash).toBeDefined()
        expect(point.slot).toBeDefined()
      })
    })
    describe('nonMyopicMemberRewards', () => {
      describe('fetches the Non-myopic member rewards for each pool. Used in ranking.', () => {
        it('accepts array of values, either stake key hash or lovelace', async () => {
          const stakeKeyHash = 'e07bb8d7762ebb0f7340c03e69b3b1aa253dab7ba3c62ebbd50781423a'
          const rewards = await nonMyopicMemberRewards([
            stakeKeyHash
          ],
          { connection }
          )
          expect(
            Object.values(
              Object.values(rewards)[0]
            )[0]
          ).toBeDefined()
        })
      })
    })
    describe('proposedProtocolParameters', () => {
      it('fetches the current shelley protocol parameters', async () => {
        const protocolParameters = await proposedProtocolParameters({ connection })
        const params = Object.values(protocolParameters)[0]
        expect(params.minFeeCoefficient).toBeDefined()
        expect(params.minUtxoValue).toBeDefined()
        expect(params.maxTxSize).toBeDefined()
      })
    })
    describe('stakeDistribution', () => {
      it('fetches the distribution of the stake across all known stake pools', async () => {
        const poolDistribution = await stakeDistribution({ connection })
        const pool = Object.values(poolDistribution)[0]
        expect(pool.stake).toBeDefined()
        expect(pool.vrf).toBeDefined()
      })
    })
    describe('utxo', () => {
      // Todo: Enable
      // it('fetches the complete UTxO set when no addresses are provided', async () => {
      //   const utxoSet = await utxo({ connection })
      //   console.log(utxoSet)
      //   expect(utxoSet[0]).toBeDefined()
      // })
      it('fetches the UTxO for the given addresses', async () => {
        const utxoSet = await utxo(['addr_test1qqymtheun4y437fa6cms4jmtfex39wzz7jfwggudwnqkdnr8udjk6d89dcjadt7tw6hmz0aeue2jzdpl2vnkz8wdk4fqz3y5m9'], { connection })
        expect(utxoSet[0]).toBeDefined()
      })
    })
  })
})