/* eslint-disable @typescript-eslint/ban-ts-comment */

import type { PendingRpcSubscription, RpcSubscriptions } from '@solana/rpc-transport';

import { Slot, U64UnsafeBeyond2Pow53Minus1 } from '../../rpc-methods/common';
import { SlotsUpdatesNotificationsApi } from '../slots-updates-notifications';

async () => {
    const rpcSubscriptions = null as unknown as RpcSubscriptions<SlotsUpdatesNotificationsApi>;

    type TNotification = Readonly<{
        parent?: Slot;
        slot: Slot;
        timestamp: U64UnsafeBeyond2Pow53Minus1;
        type:
            | 'completed'
            | 'createdBank'
            | 'dead'
            | 'firstShredReceived'
            | 'frozen'
            | 'optimisticConfirmation'
            | 'root';
    }>;
    rpcSubscriptions.slotsUpdatesNotifications() satisfies PendingRpcSubscription<TNotification>;
    rpcSubscriptions
        .slotsUpdatesNotifications()
        .subscribe({ abortSignal: new AbortController().signal }) satisfies Promise<AsyncIterable<TNotification>>;

    // @ts-expect-error Takes no params.
    rpcSubscriptions.slotNotifications({ commitment: 'finalized' });
};
