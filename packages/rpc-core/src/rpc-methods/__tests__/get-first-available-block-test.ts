import { createHttpTransport, createJsonRpc } from '@solana/rpc-transport';
import type { Rpc } from '@solana/rpc-types';
import fetchMock from 'jest-fetch-mock-fork';

import { createSolanaRpcApi, GetFirstAvailableBlockApi } from '../index';

describe('getFirstAvailableBlock', () => {
    let rpc: Rpc<GetFirstAvailableBlockApi>;
    beforeEach(() => {
        fetchMock.resetMocks();
        fetchMock.dontMock();
        rpc = createJsonRpc({
            api: createSolanaRpcApi<GetFirstAvailableBlockApi>(),
            transport: createHttpTransport({ url: 'http://127.0.0.1:8899' }),
        });
    });
    describe('when called with no parameters', () => {
        it('returns a bigint', async () => {
            expect.assertions(1);
            const result = await rpc.getFirstAvailableBlock().send();
            expect(result).toEqual(expect.any(BigInt));
        });
    });
});
