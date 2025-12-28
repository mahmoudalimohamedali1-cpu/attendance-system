import { Injectable } from '@nestjs/common';

/**
 * قاموس مطابقة أسماء الأعمدة العربية والإنجليزية (موسع)
 */
const COLUMN_DICTIONARY: Record<string, string[]> = {
    // البيانات الأساسية
    first_name: [
        'الاسم الأول', 'الاسم', 'first name', 'firstname', 'اسم أول', 'الاسم_الأول',
        'fname', 'given name', 'اسم الموظف', 'الإسم الأول', 'الاسم الاول', 'إسم',
        'اسم', 'first', 'الأسم', 'الأسم الأول'
    ],
    last_name: [
        'الاسم الأخير', 'اللقب', 'last name', 'lastname', 'اسم العائلة', 'الاسم_الأخير',
        'اسم ثاني', 'lname', 'surname', 'family name', 'الإسم الأخير', 'اسم الاب',
        'اسم الأب', 'العائلة', 'الاسم الثاني', 'last', 'اسم اخير', 'اخير'
    ],
    email: [
        'البريد الإلكتروني', 'الايميل', 'البريد', 'ايميل', 'e-mail', 'البريد_الإلكتروني',
        'ايميل العمل', 'بريد الموظف', 'email address', 'mail', 'الإيميل', 'بريد',
        'إيميل', 'البريد الالكتروني', 'عنوان البريد', 'ايميل الموظف'
    ],
    phone: [
        'رقم الهاتف', 'الهاتف', 'الجوال', 'موبايل', 'رقم الجوال', 'mobile', 'telephone',
        'رقم_الهاتف', 'تليفون', 'رقم الموبايل', 'جوال', 'هاتف', 'رقم التواصل',
        'phone number', 'cell', 'tel', 'الموبايل', 'نمبر', 'رقم التلفون', 'تلفون'
    ],
    password: [
        'كلمة المرور', 'كلمة السر', 'الباسورد', 'رمز الدخول', 'password', 'pass',
        'الرقم السري', 'رقم سري', 'كلمه المرور', 'باسورد'
    ],
    employee_code: [
        'كود الموظف', 'رقم الموظف', 'الرقم الوظيفي', 'employee id', 'emp code', 'رقم_الموظف',
        'كود', 'employee code', 'emp id', 'رمز الموظف', 'id', 'employee number',
        'الرقم الوظيفى', 'رقم وظيفي', 'كود الشركة', 'رقم العامل'
    ],

    // بيانات الهوية
    national_id: [
        'رقم الهوية', 'الهوية', 'رقم الهوية الوطنية', 'هوية', 'national id', 'id number',
        'رقم_الهوية', 'الهوية الوطنية', 'بطاقة الهوية', 'رقم البطاقة', 'هوية وطنية',
        'national identity', 'saudi id', 'رقم الهويه'
    ],
    iqama_number: [
        'رقم الإقامة', 'الإقامة', 'اقامة', 'iqama', 'residence number', 'رقم_الإقامة',
        'رقم الاقامة', 'الاقامة', 'اقامه', 'residence permit', 'إقامة', 'residence id'
    ],
    gosi_number: [
        'رقم التأمينات', 'التأمينات الاجتماعية', 'gosi', 'رقم_التأمينات', 'تأمينات',
        'التامينات', 'رقم التامينات', 'social insurance', 'gosi number', 'تأمين',
        'رقم الضمان', 'التأمين الاجتماعي'
    ],
    passport_number: [
        'رقم الجواز', 'الجواز', 'جواز السفر', 'passport', 'رقم_الجواز',
        'passport number', 'جواز', 'رقم جواز السفر', 'travel document'
    ],

    // بيانات شخصية
    date_of_birth: [
        'تاريخ الميلاد', 'الميلاد', 'birth date', 'dob', 'تاريخ_الميلاد', 'سنة الميلاد',
        'تاريخ الولادة', 'birthdate', 'date of birth', 'ميلاد', 'المواليد',
        'تاريخ ميلاد', 'عيد الميلاد', 'born date'
    ],
    gender: [
        'الجنس', 'النوع', 'ذكر/أنثى', 'sex', 'gender', 'ذكر أنثى',
        'الجنس ذكر انثى', 'نوع الجنس', 'male/female'
    ],
    nationality: [
        'الجنسية', 'جنسية', 'البلد', 'nationality', 'الجنسيه', 'بلد المنشأ',
        'الدولة', 'دولة', 'country', 'nation', 'جنسيه'
    ],
    is_saudi: [
        'سعودي', 'هل سعودي', 'الجنسية سعودية', 'مواطن', 'سعودى', 'saudi',
        'مواطن سعودي', 'سعودي/غير سعودي', 'نوع الجنسية'
    ],
    marital_status: [
        'الحالة الاجتماعية', 'الحالة', 'متزوج/أعزب', 'marital status', 'الحالة_الاجتماعية',
        'الحاله الاجتماعيه', 'متزوج', 'أعزب', 'اعزب', 'الحالة الزوجية', 'married/single'
    ],

    // بيانات الوظيفة
    job_title: [
        'المسمى الوظيفي', 'الوظيفة', 'المنصب', 'job title', 'position', 'المسمى',
        'الدرجة الوظيفية', 'المسمي الوظيفي', 'وظيفة', 'job', 'title', 'العمل',
        'نوع العمل', 'المهنة', 'مسمى وظيفي', 'المسمى_الوظيفي', 'الوظيفه'
    ],
    role: [
        'الدور', 'الصلاحية', 'نوع الحساب', 'موظف/مدير', 'role', 'user role',
        'نوع المستخدم', 'مستوى الصلاحية', 'access level', 'الصلاحيات'
    ],
    hire_date: [
        'تاريخ التعيين', 'تاريخ التوظيف', 'تاريخ الالتحاق', 'hire date', 'joining date',
        'تاريخ_التعيين', 'بداية العمل', 'تاريخ بداية العمل', 'start date', 'join date',
        'تاريخ الانضمام', 'تاريخ مباشرة العمل', 'تاريخ المباشرة', 'تاريخ الاستلام',
        'تاريخ التسجيل', 'تاريخ الدخول', 'تاريخ التعاقد', 'hire_date', 'hired date',
        'تاريخ البدء', 'بدء العمل'
    ],
    salary: [
        'الراتب', 'راتب الدوام', 'الراتب الشهري', 'الراتب الأساسي', 'المرتب', 'salary',
        'الراتب_الشهري', 'راتب', 'الأجر', 'المرتب الأساسي', 'المرتب الشهري',
        'basic salary', 'monthly salary', 'اجر', 'الاجر', 'wage', 'pay',
        'راتب اساسي', 'الراتب الاساسي', 'راتب شهري', 'القيمة', 'مرتب'
    ],

    // الفرع والقسم
    branch_code: [
        'الفرع', 'كود الفرع', 'اسم الفرع', 'branch', 'الفرع_الرئيسي', 'branch code',
        'فرع', 'branch name', 'اسم الفرع', 'موقع العمل', 'مكان العمل', 'الموقع'
    ],
    department_code: [
        'القسم', 'كود القسم', 'اسم القسم', 'department', 'الإدارة', 'department code',
        'قسم', 'dept', 'الادارة', 'department name', 'إدارة', 'ادارة', 'section'
    ],

    // التواريخ
    passport_expiry: [
        'تاريخ انتهاء الجواز', 'انتهاء الجواز', 'passport expiry', 'صلاحية الجواز',
        'تاريخ صلاحية الجواز', 'انتهاء صلاحية الجواز', 'passport exp'
    ],
    iqama_expiry: [
        'تاريخ انتهاء الإقامة', 'انتهاء الإقامة', 'iqama expiry', 'صلاحية الإقامة',
        'تاريخ صلاحية الاقامة', 'انتهاء الاقامة', 'iqama exp'
    ],

    // حقول إضافية شائعة
    bank_iban: [
        'رقم الآيبان', 'الآيبان', 'iban', 'رقم الحساب البنكي', 'الحساب البنكي',
        'رقم الحساب', 'bank account', 'iban number', 'ايبان', 'الايبان'
    ],
    bank_name: [
        'اسم البنك', 'البنك', 'bank name', 'bank', 'المصرف', 'اسم المصرف'
    ],
    address: [
        'العنوان', 'عنوان السكن', 'address', 'السكن', 'مكان الإقامة', 'عنوان',
        'home address', 'residential address'
    ],
};

/**
 * الحقول المعروفة في النظام
 */
const KNOWN_FIELDS = Object.keys(COLUMN_DICTIONARY);

export interface ColumnMapping {
    sourceColumn: string;      // اسم العمود في الملف
    targetField: string | null; // الحقل المطابق في النظام (null = حقل مخصص جديد)
    confidence: number;        // نسبة الثقة (0-1)
    isCustomField: boolean;    // هل سيتم إضافته كحقل مخصص
    suggestions: string[];     // اقتراحات بديلة
}

export interface SmartMappingResult {
    mappings: ColumnMapping[];
    unmappedColumns: string[];  // أعمدة لم يتم التعرف عليها
    autoMappedCount: number;
    customFieldsCount: number;
}

@Injectable()
export class ColumnMapperService {

    /**
     * تحليل أعمدة الملف وإيجاد أفضل مطابقة
     */
    analyzeColumns(headers: string[]): SmartMappingResult {
        const mappings: ColumnMapping[] = [];
        const unmappedColumns: string[] = [];
        let autoMappedCount = 0;
        let customFieldsCount = 0;

        for (const header of headers) {
            const mapping = this.findBestMatch(header);
            mappings.push(mapping);

            if (mapping.targetField) {
                autoMappedCount++;
            } else {
                unmappedColumns.push(header);
                customFieldsCount++;
            }
        }

        return {
            mappings,
            unmappedColumns,
            autoMappedCount,
            customFieldsCount,
        };
    }

    /**
     * البحث عن أفضل مطابقة لعمود معين
     */
    private findBestMatch(sourceColumn: string): ColumnMapping {
        const normalized = this.normalizeText(sourceColumn);
        let bestMatch: { field: string; score: number } | null = null;

        // البحث في القاموس
        for (const [field, aliases] of Object.entries(COLUMN_DICTIONARY)) {
            // تطابق تام مع اسم الحقل
            if (normalized === this.normalizeText(field)) {
                return this.createMapping(sourceColumn, field, 1.0);
            }

            // البحث في المرادفات
            for (const alias of aliases) {
                const aliasNormalized = this.normalizeText(alias);

                // تطابق تام
                if (normalized === aliasNormalized) {
                    return this.createMapping(sourceColumn, field, 1.0);
                }

                // تطابق جزئي (يحتوي على)
                if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
                    const score = this.calculateSimilarity(normalized, aliasNormalized);
                    if (!bestMatch || score > bestMatch.score) {
                        bestMatch = { field, score };
                    }
                }

                // Fuzzy matching
                const fuzzyScore = this.fuzzyMatch(normalized, aliasNormalized);
                if (fuzzyScore > 0.7 && (!bestMatch || fuzzyScore > bestMatch.score)) {
                    bestMatch = { field, score: fuzzyScore };
                }
            }
        }

        // إذا وجد تطابق جيد
        if (bestMatch && bestMatch.score >= 0.6) {
            return this.createMapping(sourceColumn, bestMatch.field, bestMatch.score);
        }

        // حقل مخصص جديد
        return {
            sourceColumn,
            targetField: null,
            confidence: 0,
            isCustomField: true,
            suggestions: this.getSuggestions(normalized),
        };
    }

    /**
     * إنشاء كائن المطابقة
     */
    private createMapping(source: string, target: string, confidence: number): ColumnMapping {
        return {
            sourceColumn: source,
            targetField: target,
            confidence,
            isCustomField: false,
            suggestions: [],
        };
    }

    /**
     * تطبيع النص (إزالة المسافات والرموز وتوحيد الحروف)
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[\s_-]+/g, '') // إزالة المسافات والشرطات
            .replace(/[^\u0600-\u06FFa-z0-9]/g, ''); // إبقاء العربية والإنجليزية والأرقام فقط
    }

    /**
     * حساب التشابه بين نصين
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const matchLength = longer.includes(shorter) ? shorter.length : 0;
        return matchLength / longer.length;
    }

    /**
     * Fuzzy matching باستخدام Levenshtein Distance
     */
    private fuzzyMatch(str1: string, str2: string): number {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1.0;
        return 1 - (distance / maxLength);
    }

    /**
     * حساب مسافة Levenshtein
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str1.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str1.length; i++) {
            for (let j = 1; j <= str2.length; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[str1.length][str2.length];
    }

    /**
     * الحصول على اقتراحات للحقول المشابهة
     */
    private getSuggestions(normalized: string): string[] {
        const suggestions: { field: string; score: number }[] = [];

        for (const field of KNOWN_FIELDS) {
            const score = this.fuzzyMatch(normalized, this.normalizeText(field));
            if (score > 0.3) {
                suggestions.push({ field, score });
            }
        }

        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.field);
    }

    /**
     * الحصول على الحقول المعروفة
     */
    getKnownFields(): string[] {
        return KNOWN_FIELDS;
    }

    /**
     * تحويل اسم الحقل للعربية
     */
    getFieldLabel(field: string): string {
        const labels: Record<string, string> = {
            first_name: 'الاسم الأول',
            last_name: 'الاسم الأخير',
            email: 'البريد الإلكتروني',
            phone: 'رقم الهاتف',
            password: 'كلمة المرور',
            employee_code: 'كود الموظف',
            national_id: 'رقم الهوية',
            iqama_number: 'رقم الإقامة',
            gosi_number: 'رقم التأمينات',
            passport_number: 'رقم الجواز',
            date_of_birth: 'تاريخ الميلاد',
            gender: 'الجنس',
            nationality: 'الجنسية',
            is_saudi: 'سعودي',
            marital_status: 'الحالة الاجتماعية',
            job_title: 'المسمى الوظيفي',
            role: 'الدور',
            hire_date: 'تاريخ التعيين',
            salary: 'الراتب',
            branch_code: 'الفرع',
            department_code: 'القسم',
            passport_expiry: 'انتهاء الجواز',
            iqama_expiry: 'انتهاء الإقامة',
        };
        return labels[field] || field;
    }
}
