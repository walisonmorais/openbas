package io.openbas.injects.email;

import io.openbas.asset.InjectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class EmailInjector {

    private static final String EMAIL_INJECTOR_NAME = "Email";
    private static final String EMAIL_INJECTOR_ID = "41b4dd55-5bd1-4614-98cd-9e3770753306";

    @Autowired
    public EmailInjector(InjectorService injectorService, EmailContract contract) {
        try {
            injectorService.register(EMAIL_INJECTOR_ID, EMAIL_INJECTOR_NAME, contract);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
