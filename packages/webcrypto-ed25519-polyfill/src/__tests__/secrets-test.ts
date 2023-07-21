import { exportKeyPolyfill, generateKeyPolyfill, isPolyfilledKey, signPolyfill } from '../secrets';

const MOCK_DATA = new Uint8Array([1, 2, 3]);
const MOCK_DATA_SIGNATURE = new Uint8Array([
    239, 105, 216, 141, 51, 239, 0, 205, 191, 77, 181, 210, 95, 178, 175, 34, 226, 220, 252, 118, 255, 132, 101, 63, 35,
    245, 181, 165, 19, 73, 242, 201, 84, 233, 251, 88, 27, 10, 18, 59, 1, 101, 228, 9, 14, 200, 66, 233, 195, 13, 79,
    72, 48, 6, 161, 22, 137, 127, 73, 135, 139, 150, 125, 11,
]);
const MOCK_SECRET_KEY_BYTES = new Uint8Array([
    83, 147, 250, 112, 140, 37, 29, 73, 156, 38, 185, 76, 163, 8, 178, 225, 172, 53, 120, 108, 127, 191, 103, 8, 160,
    170, 183, 186, 246, 1, 227, 158,
]);
const MOCK_PUBLIC_KEY_BYTES = new Uint8Array([
    166, 132, 114, 186, 49, 163, 23, 12, 11, 14, 119, 219, 102, 96, 26, 226, 91, 97, 238, 217, 236, 84, 232, 204, 62,
    212, 179, 252, 20, 37, 179, 52,
]);

describe('exportKeyPolyfill', () => {
    it.each(['jwk', 'pkcs8', 'spki'] as const)('throws an unimplemented error when the format is %s', format => {
        const mockKey = { format } as unknown as CryptoKey;
        expect(() => exportKeyPolyfill(format, mockKey)).toThrow(/unimplemented/);
    });
    it('throws when the key supplied is non-extractable', () => {
        const mockKey = { extractable: false, type: 'public' } as unknown as CryptoKey;
        expect(() => exportKeyPolyfill('raw', mockKey)).toThrow();
    });
    it.each(['private', 'secret'] as KeyType[])('throws when a %s key is supplied', type => {
        const mockKey = { extractable: true, type } as unknown as CryptoKey;
        expect(() => exportKeyPolyfill('raw', mockKey)).toThrow();
    });
    it('throws when supplied a public key that was not generated with the polyfill', async () => {
        expect.assertions(1);
        const { publicKey } = (await crypto.subtle.generateKey('Ed25519', /* extractable */ false, [
            'sign',
            'verify',
        ])) as CryptoKeyPair;
        await expect(() => exportKeyPolyfill('raw', publicKey)).toThrow();
    });
    it('returns the public key bytes associated with a secret key generated by the polyfill', async () => {
        expect.assertions(1);
        jest.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValue(MOCK_SECRET_KEY_BYTES);
        const { publicKey } = generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
        expect(exportKeyPolyfill('raw', publicKey)).toEqual(MOCK_PUBLIC_KEY_BYTES);
    });
});

describe('generateKeyPolyfill', () => {
    it('stores secret key bytes in an internal cache', () => {
        const weakMapSetSpy = jest.spyOn(WeakMap.prototype, 'set');
        const expectedSecretKey = new Uint8Array(Array(32).fill(1));
        jest.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValue(expectedSecretKey);
        generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
        expect(weakMapSetSpy).toHaveBeenCalledWith(expect.anything(), expectedSecretKey);
    });
    describe.each(['public', 'private'])('when generating a %s key', type => {
        let keyPair: CryptoKeyPair;
        beforeEach(() => {
            keyPair = generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
        });
        it(`has the algorithm "Ed25519"`, () => {
            expect(keyPair).toHaveProperty([`${type}Key`, 'algorithm', 'name'], 'Ed25519');
        });
        it('has the string tag "CryptoKey"', () => {
            expect(keyPair).toHaveProperty([`${type}Key`, Symbol.toStringTag], 'CryptoKey');
        });
        it(`has the type "${type}"`, () => {
            expect(keyPair).toHaveProperty([`${type}Key`, 'type'], type);
        });
    });
    it.each([true, false])(
        "sets the private key's `extractable` to `false` when generating a key pair with the extractability `%s`",
        extractable => {
            const { privateKey } = generateKeyPolyfill(extractable, ['sign', 'verify']);
            expect(privateKey).toHaveProperty('extractable', extractable);
        }
    );
    it.each([true, false])(
        "sets the public key's `extractable` to `true` when generating a key pair with the extractability `%s`",
        extractable => {
            const { publicKey } = generateKeyPolyfill(extractable, ['sign', 'verify']);
            expect(publicKey).toHaveProperty('extractable', true);
        }
    );
    it.each(['decrypt', 'deriveBits', 'deriveKey', 'encrypt', 'unwrapKey', 'wrapKey'] as KeyUsage[])(
        'fatals when the usage `%s` is specified',
        usage => {
            expect(() => generateKeyPolyfill(/* extractable */ false, [usage])).toThrow();
        }
    );
    it("includes `sign` among the private key's usages when the `sign` usage is specified", () => {
        const { privateKey } = generateKeyPolyfill(/* extractable */ false, ['sign']);
        expect(privateKey).toHaveProperty('usages', expect.arrayContaining(['sign']));
    });
    it("sets the private key's usages to an empty array when the `sign` usage is not specified", () => {
        const { privateKey } = generateKeyPolyfill(/* extractable */ false, ['verify']);
        expect(privateKey).toHaveProperty('usages', []);
    });
    it("does not include `verify` among the private key's usages when the `verify` usage is specified", () => {
        const { privateKey } = generateKeyPolyfill(/* extractable */ false, ['verify']);
        expect(privateKey).toHaveProperty('usages', []);
    });
    it("does not include `sign` among the public key's usages when the `sign` usage is specified", () => {
        const { publicKey } = generateKeyPolyfill(/* extractable */ false, ['sign']);
        expect(publicKey).toHaveProperty('usages', []);
    });
    it("sets the public key's usages to an empty array when the `verify` usage is not specified", () => {
        const { publicKey } = generateKeyPolyfill(/* extractable */ false, ['sign']);
        expect(publicKey).toHaveProperty('usages', []);
    });
    it("includes `verify` among the public key's usages when the `verify` usage is specified", () => {
        const { publicKey } = generateKeyPolyfill(/* extractable */ false, ['verify']);
        expect(publicKey).toHaveProperty('usages', expect.arrayContaining(['verify']));
    });
    it('fatals when no key usages are specified', () => {
        expect(() => generateKeyPolyfill(/* extractable */ false, [])).toThrow();
    });
    describe('when no CSPRNG can be found', () => {
        let oldGetRandomValues: Crypto['getRandomValues'];
        beforeEach(() => {
            oldGetRandomValues = globalThis.crypto.getRandomValues;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            globalThis.crypto.getRandomValues = undefined;
        });
        afterEach(() => {
            globalThis.crypto.getRandomValues = oldGetRandomValues;
        });
        it('fatals', () => {
            expect(() => {
                generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
            }).toThrow();
        });
    });
});

describe('isPolyfilledKey', () => {
    it('returns true when given a public key produced with generateKeyPolyfill()', () => {
        const key = generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
        expect(isPolyfilledKey(key.publicKey)).toBe(true);
    });
    it('returns true when given a private key produced with generateKeyPolyfill()', () => {
        const key = generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']);
        expect(isPolyfilledKey(key.privateKey)).toBe(true);
    });
    it('returns false when given a public key produced with the native keygen', async () => {
        expect.assertions(1);
        const key = (await crypto.subtle.generateKey('Ed25519', /* extractable */ false, [
            'sign',
            'verify',
        ])) as CryptoKeyPair;
        expect(isPolyfilledKey(key.publicKey)).toBe(false);
    });
    it('returns false when given a private key produced with the native keygen', async () => {
        expect.assertions(1);
        const key = (await crypto.subtle.generateKey('Ed25519', /* extractable */ false, [
            'sign',
            'verify',
        ])) as CryptoKeyPair;
        expect(isPolyfilledKey(key.privateKey)).toBe(false);
    });
});

describe('signPolyfill', () => {
    let privateKey: CryptoKey;
    beforeEach(() => {
        jest.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValue(MOCK_SECRET_KEY_BYTES);
        privateKey = generateKeyPolyfill(/* extractable */ false, ['sign', 'verify']).privateKey;
    });
    it('throws when the key supplied has no "sign" usage', () => {
        const mockKey = { type: 'private', usages: ['verify'] } as unknown as CryptoKey;
        expect(() => signPolyfill(mockKey, MOCK_DATA)).toThrow(/Unable to use this key to sign/);
    });
    it.each(['public', 'secret'] as KeyType[])('throws when a %s key is supplied', type => {
        const mockKey = { type, usages: ['sign'] } as unknown as CryptoKey;
        expect(() => signPolyfill(mockKey, MOCK_DATA)).toThrow(/Unable to use this key to sign/);
    });
    it('produces the expected signature given a private key', async () => {
        expect.assertions(1);
        const signature = await signPolyfill(privateKey, MOCK_DATA);
        expect(signature).toEqual(MOCK_DATA_SIGNATURE);
    });
    it('produces signatures 64 bytes in length', async () => {
        expect.assertions(1);
        const signature = await signPolyfill(privateKey, MOCK_DATA);
        expect(signature).toHaveLength(64);
    });
});
