package io.openex.management.camel;

import org.apache.camel.impl.DefaultCamelContext;

/**
 * Created by Julien on 16/10/2016.
 */
public interface IOpenexContext {
	DefaultCamelContext getContext();
}
