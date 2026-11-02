import { AI_SCHEMA, AiOrder, aiIssues, aiToPayload, emptyAiOrder } from './ai-order.types';
import { getOrderTotal } from '../common/utils/order-calculations';

function completeOrder(type = 'interiorDoor'): AiOrder {
  const order = emptyAiOrder();
  order.header = { name: 'Тест', phone: '79000000000', date: '2026-11-02', needsDelivery: false };
  const fields: AiOrder['header'] = {};
  for (const [key, def] of Object.entries(AI_SCHEMA.items[type].fields))
    if (def.required)
      fields[key] = def.options?.[0] ?? (def.type === 'number' ? 1 : def.type === 'boolean' ? false : 'Тест');
  order.items = [{ itemId: 'one', type, fields }];
  return order;
}
describe('AI draft adapter', () => {
  it('keeps missing prices and explicit zero distinct', () => {
    const order = completeOrder();
    delete order.items[0].fields['price'];
    expect(aiIssues(order).some((i) => i.path === 'items.one.price')).toBeTrue();
    expect(() => aiToPayload(order)).toThrow();
    order.items[0].fields['price'] = 0;
    expect(aiIssues(order)).toEqual([]);
  });
  it('calculates two explicit door sizes using existing pricing', () => {
    const order = completeOrder();
    Object.assign(order.items[0].fields, { width: 80, height: 200, count: 2, price: 12000 });
    order.items.push({
      itemId: 'two',
      type: 'interiorDoor',
      fields: { ...order.items[0].fields, width: 70, count: 1 },
    });
    const payload = aiToPayload(order);
    expect(payload.interiorDoors.length).toBe(2);
    expect(getOrderTotal(payload)).toBe(36000);
  });
  it('converts every existing type and derives panel area without losing quantity', () => {
    expect(Object.keys(AI_SCHEMA.items).length).toBe(8);
    for (const type of Object.keys(AI_SCHEMA.items)) {
      const order = completeOrder(type);
      if (type === 'hardware') Object.assign(order.items[0].fields, { handleCount: 1, handlePrice: 500 });
      if (type === 'paneling') Object.assign(order.items[0].fields, { width: 100, height: 200, count: 3, price: 10 });
      const payload = aiToPayload(order);
      expect(Number.isFinite(getOrderTotal(payload)))
        .withContext(type)
        .toBeTrue();
      if (type === 'paneling') {
        expect(payload.panelings[0].sizes.length).toBe(3);
        expect(payload.panelings[0].totalArea).toBe(6);
        expect(getOrderTotal(payload)).toBe(60);
      }
    }
  });
  it('requires both price and count for a double leaf', () => {
    const order = completeOrder();
    order.items[0].fields['leafType'] = 'Double';
    expect(aiIssues(order).some((i) => i.path.endsWith('price2'))).toBeTrue();
  });
  it('rejects fractional quantity instead of rounding it silently', () => {
    const order = completeOrder();
    order.items[0].fields['count'] = 1.5;
    expect(() => aiToPayload(order)).toThrow();
  });
});
