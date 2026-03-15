import { NextRequest } from 'next/server'
import { POST } from '../route'

describe('/api/plaid/webhook', () => {
  it('returns success when webhook received', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ webhook_type: 'TRANSACTIONS' }),
    } as unknown as NextRequest

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Webhook received')
  })

  it('returns 500 when request.json throws', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new Error('parse error')),
    } as unknown as NextRequest

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to process webhook')
  })
})
