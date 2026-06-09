import React, { useEffect, useMemo, useRef, useState } from 'react';
import AnimatedBackground from '../components/AnimatedBackground';

type CatalogProduct = {
    code: string;
    name: string;
    category: string;
    unit: string;
    description: string;
    price: number;
    stock: number;
};

type InvoiceLine = {
    product: CatalogProduct;
    quantity: number;
};

type ImportStatus = {
    type: 'success' | 'warning' | 'error';
    message: string;
};

type CandidateApp = {
    name: string;
    match: number;
    note: string;
    features: string[];
};

type SavedDraft = {
    invoiceLines?: InvoiceLine[];
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    notes?: string;
    discountRate?: number;
    taxRate?: number;
};

const seedProducts: CatalogProduct[] = [
    {
        code: 'HZ-001',
        name: 'معدات ضغط صحية',
        category: 'معدات صحية',
        unit: 'قطعة',
        description: 'معدات ضغط عالية الجودة مع ضمان رسمي',
        price: 950,
        stock: 28,
    },
    {
        code: 'HZ-002',
        name: 'خزان مياه معقم',
        category: 'سباكة',
        unit: 'قطعة',
        description: 'خزان مياه قابل للتركيب مع تصميم قوي',
        price: 720,
        stock: 14,
    },
    {
        code: 'HZ-003',
        name: 'سيفون مطبخ',
        category: 'سباكة',
        unit: 'قطعة',
        description: 'سيفون مطبخ مطور ومقاوم للتسرب',
        price: 180,
        stock: 40,
    },
    {
        code: 'HZ-004',
        name: 'شاشة قياس حرارة',
        category: 'معدات صحية',
        unit: 'قطعة',
        description: 'شاشة حرارة دقيقة ومريحة في الاستخدام',
        price: 320,
        stock: 22,
    },
    {
        code: 'HZ-005',
        name: 'حنفية يدوية',
        category: 'سباكة',
        unit: 'قطعة',
        description: 'حنفية يدوية أنيقة وسهلة التركيب',
        price: 140,
        stock: 33,
    },
    {
        code: 'HZ-006',
        name: 'جهاز تنقية ماء',
        category: 'معدات صحية',
        unit: 'قطعة',
        description: 'تنقية متقدمة مع فلتر متعدد المراحل',
        price: 1450,
        stock: 9,
    },
];

const STORAGE_KEY = 'hijaz-maza-like-draft-v1';

const normalizeImportedProduct = (rawProduct: Record<string, unknown>, fallbackCode: string): CatalogProduct => {
    const code = String(
        rawProduct.code ??
            rawProduct.item_code ??
            rawProduct.part_no ??
            rawProduct['الكود'] ??
            rawProduct['رقم الصنف'] ??
            fallbackCode,
    );
    const name = String(
        rawProduct.name ??
            rawProduct.item_name ??
            rawProduct['اسم'] ??
            rawProduct['الصنف'] ??
            rawProduct.description ??
            'منتج غير مسمى',
    );
    const category = String(rawProduct.category ?? rawProduct.group ?? rawProduct['الفئة'] ?? rawProduct['القسم'] ?? 'عام');
    const unit = String(rawProduct.unit ?? rawProduct.qty_unit ?? rawProduct['الوحدة'] ?? 'قطعة');
    const description = String(
        rawProduct.description ??
            rawProduct.notes ??
            rawProduct['الوصف'] ??
            'تم الاستيراد من ملف بيانات',
    );
    const price = Number(
        rawProduct.price ??
            rawProduct.unit_price ??
            rawProduct.sale_price ??
            rawProduct['السعر'] ??
            rawProduct['سعر الوحدة'] ??
            0,
    );
    const stock = Number(
        rawProduct.stock ??
            rawProduct.qty ??
            rawProduct.available_qty ??
            rawProduct['المخزون'] ??
            rawProduct['الكمية'] ??
            100,
    );

    return {
        code,
        name,
        category,
        unit,
        description,
        price: Number.isFinite(price) ? price : 0,
        stock: Number.isFinite(stock) ? stock : 100,
    };
};

const parseCsvProducts = (csvText: string): CatalogProduct[] => {
    const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        throw new Error('الملف فارغ');
    }

    const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
    const getHeader = (...aliases: string[]) => {
        const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
        return normalizedAliases.find((alias) => headers.includes(alias));
    };
    const requiredHeader = getHeader('name', 'item_name', 'اسم', 'الصنف', 'المسمى');

    if (!requiredHeader) {
        throw new Error('النموذج غير compatible: يجب أن يحتوي على أحد أعمدة الاسم مثل name أو اسم أو الصنف');
    }

    return lines.slice(1).map((line, index) => {
        const values = line.split(',').map((value) => value.trim());
        const getValue = (...aliases: string[]) => {
            const key = getHeader(...aliases);
            if (!key) {
                return '';
            }

            const columnIndex = headers.indexOf(key);
            return columnIndex >= 0 ? values[columnIndex] ?? '' : '';
        };

        return normalizeImportedProduct(
            {
                code: getValue('code', 'item_code', 'part_no', 'الكود', 'رقم الصنف'),
                name: getValue('name', 'item_name', 'اسم', 'الصنف', 'المسمى'),
                category: getValue('category', 'group', 'الفئة', 'القسم'),
                unit: getValue('unit', 'qty_unit', 'الوحدة'),
                description: getValue('description', 'notes', 'الوصف'),
                price: getValue('price', 'unit_price', 'sale_price', 'السعر', 'سعر الوحدة'),
                stock: getValue('stock', 'qty', 'available_qty', 'المخزون', 'الكمية'),
            },
            `CSV-${index + 1}`,
        );
    });
};

const downloadText = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const Home: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [products, setProducts] = useState<CatalogProduct[]>(seedProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('الكل');
    const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
    const [customerName, setCustomerName] = useState('عميل عام');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('نقدي');
    const [notes, setNotes] = useState('');
    const [discountRate, setDiscountRate] = useState(0);
    const [taxRate, setTaxRate] = useState(0);
    const [importStatus, setImportStatus] = useState<ImportStatus>({
        type: 'success',
        message: 'جاهز للعمل - يمكنك بدء الفاتورة أو استيراد بيانات الأصناف والأسعار.',
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const savedDraft = window.localStorage.getItem(STORAGE_KEY);
        if (!savedDraft) {
            return;
        }

        try {
            const parsed: SavedDraft = JSON.parse(savedDraft);

            if (parsed.invoiceLines) {
                setInvoiceLines(parsed.invoiceLines);
            }
            if (parsed.customerName) {
                setCustomerName(parsed.customerName);
            }
            if (parsed.customerPhone) {
                setCustomerPhone(parsed.customerPhone);
            }
            if (parsed.paymentMethod) {
                setPaymentMethod(parsed.paymentMethod);
            }
            if (parsed.notes) {
                setNotes(parsed.notes);
            }
            if (typeof parsed.discountRate === 'number') {
                setDiscountRate(parsed.discountRate);
            }
            if (typeof parsed.taxRate === 'number') {
                setTaxRate(parsed.taxRate);
            }
        } catch {
            setImportStatus({
                type: 'warning',
                message: 'تعذر قراءة المسودة السابقة. سيتم العمل على بيانات جديدة.',
            });
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                invoiceLines,
                customerName,
                customerPhone,
                paymentMethod,
                notes,
                discountRate,
                taxRate,
            }),
        );
    }, [invoiceLines, customerName, customerPhone, paymentMethod, notes, discountRate, taxRate]);

    const categories = useMemo(() => ['الكل', ...new Set(products.map((product) => product.category))], [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch = `${product.code} ${product.name} ${product.category}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'الكل' || product.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, categoryFilter]);

    const subtotal = useMemo(() => {
        return invoiceLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    }, [invoiceLines]);

    const discountAmount = subtotal * (discountRate / 100);
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const totalAmount = subtotal - discountAmount + taxAmount;

    const addToInvoice = (product: CatalogProduct) => {
        setInvoiceLines((prev) => {
            const existingLine = prev.find((line) => line.product.code === product.code);
            if (existingLine) {
                if (existingLine.quantity >= product.stock) {
                    setImportStatus({
                        type: 'warning',
                        message: `الكمية المطلوبة لـ ${product.name} تجاوزت المتوفر في المخزن`,
                    });
                    return prev;
                }

                return prev.map((line) =>
                    line.product.code === product.code
                        ? { ...line, quantity: line.quantity + 1 }
                        : line,
                );
            }

            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateLineQuantity = (code: string, quantity: number) => {
        setInvoiceLines((prev) => {
            if (quantity <= 0) {
                return prev.filter((line) => line.product.code !== code);
            }

            return prev.map((line) =>
                line.product.code === code
                    ? { ...line, quantity }
                    : line,
            );
        });
    };

    const clearInvoice = () => {
        setInvoiceLines([]);
        setDiscountRate(0);
        setTaxRate(0);
        setCustomerName('عميل عام');
        setCustomerPhone('');
        setNotes('');
        setImportStatus({
            type: 'success',
            message: 'تم مسح الفاتورة وإعادة تهيئتها بنجاح.',
        });
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const importedProducts = file.name.toLowerCase().endsWith('.json')
                ? (() => {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed)) {
                        return parsed.map((item, index) => normalizeImportedProduct(item , `JSON-${index + 1}`));
                    }
                    if (Array.isArray(parsed.products)) {
                        return parsed.products.map((item: Record<string, unknown>, index: number) =>
                            normalizeImportedProduct(item, `JSON-${index + 1}`),
                        );
                    }
                    throw new Error('صيغة JSON غير مدعومة');
                })()
                : parseCsvProducts(text);

            setProducts((current) => {
                const merged = new Map(current.map((product) => [product.code, product]));
                importedProducts.forEach((product: CatalogProduct) => merged.set(product.code, product));
                return Array.from(merged.values());
            });

            setImportStatus({
                type: 'success',
                message: `تم استيراد ${importedProducts.length} صنف/أصناف بنجاح.`,
            });
        } catch (error) {
            setImportStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'حدث خطأ في الاستيراد',
            });
        } finally {
            event.target.value = '';
        }
    };

    const exportCatalog = () => {
        const payload = JSON.stringify(products, null, 2);
        downloadText('hijaz-catalog.json', payload, 'application/json');
    };

    const exportInvoice = () => {
        const rows = invoiceLines.map((line) => {
            const price = line.product.price;
            const total = price * line.quantity;
            return `${line.product.code},${line.product.name},${line.quantity},${price},${total}`;
        });

        const csv = ['code,name,quantity,unit_price,total', ...rows].join('\n');
        downloadText('hijaz-invoice.csv', csv, 'text/csv;charset=utf-8');
    };

    const downloadTemplate = () => {
        const template = [
            'code,name,category,unit,price,stock,description',
            'HZ-101,مثال صنف,معدات صحية,قطعة,250,25,أدخل وصف الصنف هنا',
        ].join('\n');
        downloadText('mazaya-import-template.csv', template, 'text/csv;charset=utf-8');
    };

    const printInvoice = () => {
        window.print();
    };

    const aiCandidateApps: CandidateApp[] = [
        {
            name: 'Mazaya',
            match: 96,
            note: 'أفضل مرجع للواجهة المبيعاتية والمحور على الأصناف والأسعار.',
            features: ['كتالوج سريع', 'فواتير سريعة', 'مراجعة الأسعار', 'قوائم مخصصة'],
        },
        {
            name: 'Excel',
            match: 88,
            note: 'يدعم الدمج السريع بين الإدخال اليدوي والتحليل والحسابات.',
            features: ['جداول سهلة', 'تعديل مباشر', 'إجماليات حية', 'تصدير متعدد'],
        },
        {
            name: 'POS / ERP',
            match: 82,
            note: 'مفيد للمخزون والروابط بين المبيعات والفواتير.',
            features: ['مخزون', 'عمليات بيع', 'حسابات العملاء', 'خطط متابعة'],
        },
    ];

    const selectedAiFeatures = [
        'بحث فوري على الأصناف والأسعار',
        'واجهة فواتير تشبه جدول Excel',
        'استيراد/تصدير بيانات أسهل',
        'حفظ مسودة الفاتورة تلقائياً',
        'تجميع إجماليات البيع بسرعة',
    ];

    return (
        <>
            <AnimatedBackground />
            <div className="bg-gradient-overlay" />
            <div className="floating-shapes">
                <div className="floating-shape" />
                <div className="floating-shape" />
                <div className="floating-shape" />
            </div>
            <div className="app-shell">
                <div className="hero-card">
                <div>
                    <p className="eyebrow">نسخة عمل مخصصة للحجاز</p>
                    <h1>تطبيق الحجاز - نسخة مزايا وأكسيل</h1>
                    <p className="hero-copy">
                        واجهة مبيعات حديثة مع كتالوج أصناف، فواتير قابلة للتعديل، واستيراد بيانات الأسعار
                        لتصبح بيئة عمل أقرب إلى مزايا وأكثر وضوحاً وأسرع في التعامل.
                    </p>
                </div>
                <div className="hero-actions no-print">
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                        استيراد بيانات الأصناف
                    </button>
                    <button type="button" onClick={downloadTemplate}>
                        تحميل قالب الاستيراد
                    </button>
                    <button type="button" onClick={exportCatalog}>
                        تصدير الكتالوج
                    </button>
                    <button type="button" onClick={exportInvoice}>
                        تصدير الفاتورة
                    </button>
                    <button type="button" onClick={printInvoice}>
                        طباعة الفاتورة
                    </button>
                    <button type="button" onClick={clearInvoice}>
                        مسح الفاتورة
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleImport}
                style={{ display: 'none' }}
            />

            <div className={`status-banner ${importStatus.type}`}>
                {importStatus.message}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span>عدد الأصناف</span>
                    <strong>{products.length}</strong>
                </div>
                <div className="stat-card">
                    <span>إجمالي الفاتورة</span>
                    <strong>{totalAmount.toFixed(2)} ر.س</strong>
                </div>
                <div className="stat-card">
                    <span>عدد بنود الفاتورة</span>
                    <strong>{invoiceLines.length}</strong>
                </div>
                <div className="stat-card">
                    <span>متوفر للتصدير</span>
                    <strong>{filteredProducts.length}</strong>
                </div>
            </div>

            <div className="workspace-grid">
                <section className="panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">كتالوج الأصناف</p>
                            <h2>قائمة الأسعار والحركة</h2>
                        </div>
                        <div className="search-box">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="ابحث بالاسم أو الكود"
                            />
                            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="catalog-grid">
                        {filteredProducts.map((product) => (
                            <article key={product.code} className="product-card">
                                <div className="badge-row">
                                    <span>{product.category}</span>
                                    <span>{product.unit}</span>
                                </div>
                                <h3>{product.name}</h3>
                                <p className="product-desc">{product.description}</p>
                                <div className="product-meta">
                                    <span>الكود: {product.code}</span>
                                    <span>المتوفر: {product.stock}</span>
                                </div>
                                <div className="product-footer">
                                    <strong>{product.price.toFixed(2)} ر.س</strong>
                                    <button type="button" onClick={() => addToInvoice(product)}>
                                        إضافة إلى الفاتورة
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="panel invoice-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">قالب الفاتورة</p>
                            <h2>فاتورة البيع</h2>
                        </div>
                        <span className="invoice-tag">Excel-like</span>
                    </div>

                    <div className="invoice-form-grid">
                        <label>
                            اسم العميل
                            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                        </label>
                        <label>
                            رقم الهاتف
                            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                        </label>
                        <label>
                            طريقة الدفع
                            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                                <option value="نقدي">نقدي</option>
                                <option value="اجل">اجل</option>
                                <option value="تحويل">تحويل</option>
                            </select>
                        </label>
                    </div>

                    <div className="invoice-table-wrap">
                        <table className="invoice-table">
                            <thead>
                                <tr>
                                    <th>الكود</th>
                                    <th>الصنف</th>
                                    <th>الوحدة</th>
                                    <th>الكمية</th>
                                    <th>السعر</th>
                                    <th>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceLines.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="empty-row">
                                            لم يتم إضافة أي أصناف بعد. استخدم زر الإضافة من الكتالوج.
                                        </td>
                                    </tr>
                                ) : (
                                    invoiceLines.map((line) => (
                                        <tr key={line.product.code}>
                                            <td>{line.product.code}</td>
                                            <td>{line.product.name}</td>
                                            <td>{line.product.unit}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={line.quantity}
                                                    onChange={(event) =>
                                                        updateLineQuantity(line.product.code, Number(event.target.value))
                                                    }
                                                />
                                            </td>
                                            <td>{line.product.price.toFixed(2)}</td>
                                            <td>{(line.product.price * line.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="invoice-summary-grid">
                        <label>
                            نسبة الخصم %
                            <input type="number" min="0" max="100" value={discountRate} onChange={(event) => setDiscountRate(Number(event.target.value))} />
                        </label>
                        <label>
                            ضريبة %
                            <input type="number" min="0" max="100" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} />
                        </label>
                        <div className="summary-card">
                            <span>إجمالي قبل الخصم</span>
                            <strong>{subtotal.toFixed(2)} ر.س</strong>
                        </div>
                        <div className="summary-card">
                            <span>الخصم</span>
                            <strong>{discountAmount.toFixed(2)} ر.س</strong>
                        </div>
                        <div className="summary-card">
                            <span>الضريبة</span>
                            <strong>{taxAmount.toFixed(2)} ر.س</strong>
                        </div>
                        <div className="summary-card highlight">
                            <span>الإجمالي النهائي</span>
                            <strong>{totalAmount.toFixed(2)} ر.س</strong>
                        </div>
                    </div>

                    <label className="notes-area">
                        ملاحظات
                        <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
                    </label>
                </section>
            </div>

            <section className="panel insights-panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">محرك الذكاء الاصطناعي</p>
                        <h2>بحث تطبيقات مشابهة واختيار أفضل ما فيها</h2>
                    </div>
                </div>

                <div className="ai-grid">
                    <div>
                        <h3>أفضل الميزات المقترحة للتطبيق</h3>
                        <ul className="feature-list">
                            {selectedAiFeatures.map((feature) => (
                                <li key={feature}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3>تقييم التطبيقات المشابهة</h3>
                        <div className="app-rank-list">
                            {aiCandidateApps.map((app) => (
                                <article key={app.name} className="rank-card">
                                    <div className="rank-head">
                                        <h4>{app.name}</h4>
                                        <span>{app.match}%</span>
                                    </div>
                                    <p>{app.note}</p>
                                    <ul>
                                        {app.features.map((feature) => (
                                            <li key={feature}>{feature}</li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
        </>
    );
};

export default Home;