"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnMapperService = void 0;
const common_1 = require("@nestjs/common");
const COLUMN_DICTIONARY = {
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
    branch_code: [
        'الفرع', 'كود الفرع', 'اسم الفرع', 'branch', 'الفرع_الرئيسي', 'branch code',
        'فرع', 'branch name', 'اسم الفرع', 'موقع العمل', 'مكان العمل', 'الموقع'
    ],
    department_code: [
        'القسم', 'كود القسم', 'اسم القسم', 'department', 'الإدارة', 'department code',
        'قسم', 'dept', 'الادارة', 'department name', 'إدارة', 'ادارة', 'section'
    ],
    passport_expiry: [
        'تاريخ انتهاء الجواز', 'انتهاء الجواز', 'passport expiry', 'صلاحية الجواز',
        'تاريخ صلاحية الجواز', 'انتهاء صلاحية الجواز', 'passport exp'
    ],
    iqama_expiry: [
        'تاريخ انتهاء الإقامة', 'انتهاء الإقامة', 'iqama expiry', 'صلاحية الإقامة',
        'تاريخ صلاحية الاقامة', 'انتهاء الاقامة', 'iqama exp'
    ],
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
const KNOWN_FIELDS = Object.keys(COLUMN_DICTIONARY);
let ColumnMapperService = class ColumnMapperService {
    analyzeColumns(headers) {
        const mappings = [];
        const unmappedColumns = [];
        let autoMappedCount = 0;
        let customFieldsCount = 0;
        for (const header of headers) {
            const mapping = this.findBestMatch(header);
            mappings.push(mapping);
            if (mapping.targetField) {
                autoMappedCount++;
            }
            else {
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
    findBestMatch(sourceColumn) {
        const normalized = this.normalizeText(sourceColumn);
        let bestMatch = null;
        for (const [field, aliases] of Object.entries(COLUMN_DICTIONARY)) {
            if (normalized === this.normalizeText(field)) {
                return this.createMapping(sourceColumn, field, 1.0);
            }
            for (const alias of aliases) {
                const aliasNormalized = this.normalizeText(alias);
                if (normalized === aliasNormalized) {
                    return this.createMapping(sourceColumn, field, 1.0);
                }
                if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
                    const score = this.calculateSimilarity(normalized, aliasNormalized);
                    if (!bestMatch || score > bestMatch.score) {
                        bestMatch = { field, score };
                    }
                }
                const fuzzyScore = this.fuzzyMatch(normalized, aliasNormalized);
                if (fuzzyScore > 0.7 && (!bestMatch || fuzzyScore > bestMatch.score)) {
                    bestMatch = { field, score: fuzzyScore };
                }
            }
        }
        if (bestMatch && bestMatch.score >= 0.6) {
            return this.createMapping(sourceColumn, bestMatch.field, bestMatch.score);
        }
        return {
            sourceColumn,
            targetField: null,
            confidence: 0,
            isCustomField: true,
            suggestions: this.getSuggestions(normalized),
        };
    }
    createMapping(source, target, confidence) {
        return {
            sourceColumn: source,
            targetField: target,
            confidence,
            isCustomField: false,
            suggestions: [],
        };
    }
    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[\s_-]+/g, '')
            .replace(/[^\u0600-\u06FFa-z0-9]/g, '');
    }
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const matchLength = longer.includes(shorter) ? shorter.length : 0;
        return matchLength / longer.length;
    }
    fuzzyMatch(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0)
            return 1.0;
        return 1 - (distance / maxLength);
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str1.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str1.length; i++) {
            for (let j = 1; j <= str2.length; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        return matrix[str1.length][str2.length];
    }
    getSuggestions(normalized) {
        const suggestions = [];
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
    getKnownFields() {
        return KNOWN_FIELDS;
    }
    getFieldLabel(field) {
        const labels = {
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
};
exports.ColumnMapperService = ColumnMapperService;
exports.ColumnMapperService = ColumnMapperService = __decorate([
    (0, common_1.Injectable)()
], ColumnMapperService);
//# sourceMappingURL=column-mapper.service.js.map