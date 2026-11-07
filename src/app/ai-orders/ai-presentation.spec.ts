import { aiDisplayText, aiDisplayValue } from './ai-presentation';

describe('Russian AI presentation', () => {
  it('translates internal values according to the field', () => {
    expect(aiDisplayValue('Single', 'items.door.leafType')).toBe('Одностворчатая');
    expect(aiDisplayValue('Double', 'items.door.leafType')).toBe('Двустворчатая');
    expect(aiDisplayValue('factory', 'items.door.kind')).toBe('Заводская');
    expect(aiDisplayValue('right', 'items.door.opening')).toBe('Правое');
    expect(aiDisplayValue('Enamel', 'items.door.covering')).toBe('Эмаль');
    expect(aiDisplayValue('interiorDoor', 'items.door.type')).toBe('Межкомнатная дверь');
    expect(aiDisplayValue(false, 'items.door.hasGlass')).toBe('Нет');
    expect(aiDisplayValue(null, 'items.door.leafType')).toBe('—');
  });
  it('keeps names and custom dictionary values intact', () => {
    expect(aiDisplayValue('Single', 'items.door.model')).toBe('Single');
    expect(aiDisplayValue('factory', 'header.name')).toBe('factory');
    expect(aiDisplayValue('CustomBrand', 'items.door.covering')).toBe('CustomBrand');
  });
  it('translates technical words in assistant explanations without replacing word fragments', () => {
    expect(aiDisplayText('Тип Single/Double, покрытие PVC.')).toBe('Тип Одностворчатая/Двустворчатая, покрытие ПВХ.');
    expect(aiDisplayText('SingleBrand')).toBe('SingleBrand');
  });
});
