export interface Product {
    code: string;
    name: string;
    category: string;
    unit: string;
    description: string;
    price: number;
    stock: number;
}

export interface Customer {
    name: string;
    phone: string;
}

export interface InvoiceLine {
    product: Product;
    quantity: number;
}

export interface Invoice {
    lines: InvoiceLine[];
    customer: Customer;
    paymentMethod: string;
    notes: string;
    discountRate: number;
    taxRate: number;
}
