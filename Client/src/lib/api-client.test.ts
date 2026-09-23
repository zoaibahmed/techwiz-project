import { describe, expect, it, vi } from 'vitest';
import { ApiHttpError, createApiClient } from './api-client';

describe('API transport (synthetic fixtures, not production endpoints)', () => {
  it('requires an approved base and blocks origin/path escape', async () => {
    expect(() => createApiClient('')).toThrow();
    expect(() => createApiClient('https://user:password@example.test')).toThrow();
    const fetcher = vi.fn<typeof fetch>();
    const client = createApiClient('https://example.test/api/', fetcher);
    for (const path of ['//other.test', 'https://other.test', '../outside', '%2e%2e/outside', '/root', 'x\\y']) {
      await expect(client.request(path)).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('serializes JSON, forwards cancellation, and keeps auth opt-in', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}', {
      headers: { 'content-type': 'application/json' },
    }));
    const signal = new AbortController().signal;
    const result = await createApiClient('https://example.test/api', fetcher)
      .request('fixture', { method: 'POST', json: { value: 1 }, signal });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe('https://example.test/api/fixture');
    expect(init).toMatchObject({ method: 'POST', body: '{"value":1}', signal, credentials: 'omit', redirect: 'error' });
  });

  it('handles empty success and preserves unknown error structure', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('{"custom":"invalid"}', {
        status: 422, headers: { 'content-type': 'application/problem+json' },
      }));
    const client = createApiClient('https://example.test', fetcher);
    expect(await client.request('fixture')).toBeUndefined();
    await expect(client.request('fixture')).rejects.toMatchObject({ status: 422, body: { custom: 'invalid' } });
  });

  it('distinguishes malformed JSON, HTTP failures, and network failures', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{', { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockRejectedValueOnce(new TypeError('network unavailable'));
    const client = createApiClient('https://example.test', fetcher);
    await expect(client.request('fixture')).rejects.toThrow('invalid JSON');
    await expect(client.request('fixture')).rejects.toBeInstanceOf(ApiHttpError);
    await expect(client.request('fixture')).rejects.toThrow('network unavailable');
  });
});
