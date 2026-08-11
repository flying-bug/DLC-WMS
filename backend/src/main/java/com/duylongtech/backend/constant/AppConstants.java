package com.duylongtech.backend.constant;

public interface AppConstants {

    /**
     * REGEX
     */
    String SORT_TYPE_REGEX = "\\b(asc|desc)\\b";
    String FULL_NAME_REGEX = "^[\\p{L}][\\p{L}\\s'.-]{1,99}$";

    /**
     * Vinaphone   : 081, 082, 083, 084, 085, 088, 091, 094
     * Viettel     : 032, 033, 034, 035, 036, 037, 038, 039, 086, 096, 097, 098
     * Mobilephone : 070, 076, 077, 078, 079, 089, 090, 093
     * Vietnamobile: 056, 058, 092
     * Gmobile     : 059, 099
     * iTel        : 087
     * Wintel      : 055
     * VNSKY       : 077
     * Local       : 089
     */
    String MOBILE_REGEX = "(\\+84|0)[\\s.-]?(2[0-9]|3[2-9]|5[5689]|7[06-9]|8[1-9]|9[0-9])([\\s.-]?\\d){7,8}";

    /**
     * PAGINATION
     */
    String DEFAULT_PAGE = "0";
    String DEFAULT_SIZE = "10";

    /**
     * ORDER / DOCUMENT PREFIXES
     */
    String EXPORT_PREFIX = "PX";
    String IMPORT_PREFIX = "PN";
    int ORDER_NUMBER_PAD = 5;
}
