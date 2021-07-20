export const CalcCommons = {
    methods: {
        formatPrice(price: number): string {
            return price > 1000 ? price.toLocaleString(undefined, {maximumFractionDigits: 0}) : price.toLocaleString(undefined, {maximumFractionDigits: 2})
        }
    }
}