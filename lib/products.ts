export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  action: ProductAction
  priceEnvVar: string
}

export type ProductAction = 'complete_108' | 'one_more_try'

export const PRODUCTS: Product[] = [
  {
    id: 'prod_Twmap5w4jDWJhi',
    name: 'Complete 108 Arcs Guarantee',
    description: 'Unlock the power to complete your manifestation with the sacred 108 arcs',
    priceInCents: 999, // $9.99
    action: 'complete_108',
    priceEnvVar: 'STRIPE_COMPLETE_108_PRICE_ID',
  },
  {
    id: 'prod_TwmTvTgS4ELVyu',
    name: 'One More Try',
    description: 'Get one more attempt to manifest your intention',
    priceInCents: 199, // $1.99
    action: 'one_more_try',
    priceEnvVar: 'STRIPE_ONE_MORE_TRY_PRICE_ID',
  },
]

export function getProduct(productId: string) {
  return PRODUCTS.find((product) => product.id === productId) ?? null
}

export function getProductByAction(action: ProductAction) {
  return PRODUCTS.find((product) => product.action === action) ?? null
}
