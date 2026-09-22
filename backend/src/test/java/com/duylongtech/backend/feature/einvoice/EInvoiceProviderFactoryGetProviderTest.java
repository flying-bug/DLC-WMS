package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;

/**
 * EInvoiceProviderFactory.getProvider: chọn nhà cung cấp hóa đơn điện tử theo tên (không phân biệt hoa thường),
 * tên rỗng thì dùng nhà cung cấp đang cấu hình, tên lạ thì về MOCK.
 */
@UnitTestMethod(module = "EInvoiceProviderFactory",
        signature = "getProvider(String providerName)",
        technique = Technique.EP,
        precondition = "Configured einvoice.active-provider = MOCK; providers VIETTEL, MISA, XINVOICE, MOCK are registered")
class EInvoiceProviderFactoryGetProviderTest {

    private final EInvoiceProvider viettel = mock(EInvoiceProvider.class);
    private final EInvoiceProvider misa = mock(EInvoiceProvider.class);
    private final EInvoiceProvider xinvoice = mock(EInvoiceProvider.class);
    private final EInvoiceProvider mockProvider = mock(EInvoiceProvider.class);
    private EInvoiceProviderFactory factory;

    @BeforeEach
    void setUp() {
        factory = new EInvoiceProviderFactory(Map.of(
                "viettelSinvoiceProvider", viettel,
                "misaMeInvoiceProvider", misa,
                "xInvoiceProvider", xinvoice,
                "mockEInvoiceProvider", mockProvider));
        ReflectionTestUtils.setField(factory, "activeProvider", "MOCK");
    }

    @Test
    @UnitTestCase(id = "UTCID01", type = "N", purpose = "Verify VIETTEL selects the Viettel S-Invoice provider.",
            inputs = "providerName=\"VIETTEL\"", returns = "Viettel S-Invoice provider")
    void utcid01() {
        assertSame(viettel, factory.getProvider("VIETTEL"));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify the provider name is matched case-insensitively (misa -> MISA).",
            inputs = "providerName=\"misa\"", returns = "MISA meInvoice provider")
    void utcid02() {
        assertSame(misa, factory.getProvider("misa"));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify XINVOICE selects the X-Invoice provider.",
            inputs = "providerName=\"XINVOICE\"", returns = "X-Invoice provider")
    void utcid03() {
        assertSame(xinvoice, factory.getProvider("XINVOICE"));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify MOCK selects the mock provider.",
            inputs = "providerName=\"MOCK\"", returns = "Mock provider")
    void utcid04() {
        assertSame(mockProvider, factory.getProvider("MOCK"));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "A", purpose = "Verify a null name falls back to the configured provider (MOCK).",
            inputs = "providerName=null", returns = "Mock provider")
    void utcid05() {
        assertSame(mockProvider, factory.getProvider(null));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "B", purpose = "Verify a blank name falls back to the configured provider (MOCK).",
            inputs = "providerName=\"  \"", returns = "Mock provider")
    void utcid06() {
        assertSame(mockProvider, factory.getProvider("  "));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "A", purpose = "Verify an unknown provider name falls back to the mock provider.",
            inputs = "providerName=\"BKAV\"", returns = "Mock provider")
    void utcid07() {
        assertSame(mockProvider, factory.getProvider("BKAV"));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify a null name uses the configured provider when it is set to viettel (lower case).",
            inputs = "providerName=null", returns = "Viettel S-Invoice provider",
            precondition = "Configured einvoice.active-provider = viettel")
    void utcid08() {
        ReflectionTestUtils.setField(factory, "activeProvider", "viettel");
        assertSame(viettel, factory.getProvider(null));
    }
}
