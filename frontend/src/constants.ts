
import { Objective, Currency } from './types/types';

export const CURRENCIES: Currency[] = ['BRL', 'USD', 'EUR'];

export const EXCHANGE_RATES: Record<Currency, number> = {
  BRL: 1,
  USD: 5.45,
  EUR: 6.05,
};

export const CATEGORIES = [
  'Transporte',
  'Alimentação',
  'Acomodação',
  'Documentação',
  'Lazer',
  'Outros'
];