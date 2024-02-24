import { RpcTransport } from '@solana/rpc-spec';

describe('createHttpTransport', () => {
    let fetchMock: jest.Mock;
    let makeHttpRequest: RpcTransport;
    let oldFetch: typeof globalThis.fetch;
    let SolanaHttpError: typeof import('../http-transport-errors').SolanaHttpError;
    beforeEach(async () => {
        oldFetch = globalThis.fetch;
        globalThis.fetch = fetchMock = jest.fn();
        await jest.isolateModulesAsync(async () => {
            const [{ createHttpTransport }, HttpTransportErrorsModule] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                import('../http-transport'),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                import('../http-transport-errors'),
            ]);
            SolanaHttpError = HttpTransportErrorsModule.SolanaHttpError;
            makeHttpRequest = createHttpTransport({ url: 'fake://url' });
        });
    });
    afterEach(() => {
        globalThis.fetch = oldFetch;
    });
    describe('when the endpoint returns a non-200 status code', () => {
        beforeEach(() => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'We looked everywhere',
            });
        });
        it('throws HTTP errors', async () => {
            expect.assertions(3);
            const requestPromise = makeHttpRequest({ payload: 123 });
            await expect(requestPromise).rejects.toThrow(SolanaHttpError);
            await expect(requestPromise).rejects.toThrow(/We looked everywhere/);
            await expect(requestPromise).rejects.toMatchObject({ statusCode: 404 });
        });
    });
    describe('when the transport fatals', () => {
        beforeEach(() => {
            fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        });
        it('passes the exception through', async () => {
            expect.assertions(1);
            await expect(makeHttpRequest({ payload: 123 })).rejects.toThrow(new TypeError('Failed to fetch'));
        });
    });
    describe('when the endpoint returns a well-formed JSON response', () => {
        beforeEach(() => {
            fetchMock.mockResolvedValue({
                json: async () => ({ ok: true }),
                ok: true,
            });
        });
        it('calls fetch with the specified URL', () => {
            makeHttpRequest({ payload: 123 });
            expect(fetchMock).toHaveBeenCalledWith('fake://url', expect.anything());
        });
        it('sets the `body` to a stringfied version of the payload', () => {
            makeHttpRequest({ payload: { ok: true } });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: JSON.stringify({ ok: true }),
                }),
            );
        });
        it('sets the accept header to `application/json`', () => {
            makeHttpRequest({ payload: 123 });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        accept: 'application/json',
                    }),
                }),
            );
        });
        it('sets the content type header to `application/json; charset=utf-8`', () => {
            makeHttpRequest({ payload: 123 });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'content-type': 'application/json; charset=utf-8',
                    }),
                }),
            );
        });
        it('sets the content length header to the length of the JSON-stringified payload', () => {
            makeHttpRequest({
                payload:
                    // Shruggie: https://emojipedia.org/person-shrugging/
                    '\xAF\\\x5F\x28\u30C4\x29\x5F\x2F\xAF' +
                    ' ' +
                    // https://emojipedia.org/waving-hand-medium-skin-tone/
                    '\u{1F44B}\u{1F3FD}' +
                    ' ' +
                    // https://tinyurl.com/bdemuf3r
                    '\u{1F469}\u{1F3FB}\u200D\u2764\uFE0F\u200D\u{1F469}\u{1F3FF}',
            });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'content-length': '30',
                    }),
                }),
            );
        });
        it('sets the `method` to `POST`', () => {
            makeHttpRequest({ payload: 123 });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    method: 'POST',
                }),
            );
        });
    });
});
