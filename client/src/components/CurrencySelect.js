import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Select } from './ui/select';
export const COMMON_CURRENCIES = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'ILS', name: 'New Israeli Shekel (NIS / ₪)' },
    { code: 'RUB', name: 'Russian Ruble' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'KRW', name: 'Korean Won' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'PLN', name: 'Polish Zloty' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'THB', name: 'Thai Baht' },
];
export function CurrencySelect({ value, onChange, id, className }) {
    return (_jsx(Select, { id: id, value: value, onChange: (e) => onChange(e.target.value), className: className, children: COMMON_CURRENCIES.map(({ code, name }) => (_jsxs("option", { value: code, children: [code, " \u2014 ", name] }, code))) }));
}
