import type { IRpcApiMethods } from '@solana/rpc-transport';
import { Commitment } from '@solana/rpc-types';

import { Slot, U64UnsafeBeyond2Pow53Minus1 } from './common';

type GetTransactionCountApiResponse = U64UnsafeBeyond2Pow53Minus1;

export interface GetTransactionCountApi extends IRpcApiMethods {
    /**
     * Returns the current Transaction count from the ledger
     */
    getTransactionCount(
        config?: Readonly<{
            // Defaults to `finalized`
            commitment?: Commitment;
            // The minimum slot that the request can be evaluated at
            minContextSlot?: Slot;
        }>,
    ): GetTransactionCountApiResponse;
}
