/**
 * Higher-Order Components for Automatic Activity Tracking
 * Wrap any component to automatically add logging capabilities
 */
import React, { useEffect } from "react";
import activityTracker from "../utils/activityTracker";

/**
 * HOC that automatically tracks component lifecycle and props changes
 */
export function withActivityTracking(WrappedComponent, options = {}) {
  const {
    componentName = WrappedComponent.displayName || WrappedComponent.name || "UnknownComponent",
    trackProps = false,
    trackMethods = [],
    trackErrors = true,
  } = options;

  const ActivityTrackedComponent = React.forwardRef((props, ref) => {
    // Track component mount
    useEffect(() => {
      activityTracker.log("Компонент ачаалагдсан", "lifecycle", {
        componentName,
        propsCount: Object.keys(props).length,
      });

      return () => {
        activityTracker.log("Компонент устгагдсан", "lifecycle", {
          componentName,
        });
      };
    }, []);

    // Track props changes if enabled
    useEffect(() => {
      if (trackProps) {
        activityTracker.log(
          "Props өөрчлөгдсөн",
          "lifecycle",
          {
            componentName,
            propsKeys: Object.keys(props),
          },
          "debug"
        );
      }
    }, [props]);

    // Wrap specified methods with tracking
    const trackedProps = React.useMemo(() => {
      const newProps = { ...props };

      trackMethods.forEach((methodName) => {
        if (typeof props[methodName] === "function") {
          newProps[methodName] = (...args) => {
            activityTracker.log(
              `Метод дуудагдсан: ${methodName}`,
              "method",
              {
                componentName,
                methodName,
                argsCount: args.length,
              },
              "debug"
            );

            try {
              return props[methodName](...args);
            } catch (error) {
              if (trackErrors) {
                activityTracker.trackError("method_error", error.message, {
                  componentName,
                  methodName,
                });
              }
              throw error;
            }
          };
        }
      });

      return newProps;
    }, [props]);

    // Error boundary functionality
    if (trackErrors) {
      try {
        return <WrappedComponent {...trackedProps} ref={ref} />;
      } catch (error) {
        activityTracker.trackError("render_error", error.message, { componentName });
        throw error;
      }
    }

    return <WrappedComponent {...trackedProps} ref={ref} />;
  });

  ActivityTrackedComponent.displayName = `withActivityTracking(${componentName})`;
  return ActivityTrackedComponent;
}

/**
 * HOC specifically for form components
 */
export function withFormTracking(WrappedComponent, formName) {
  const FormTrackedComponent = React.forwardRef((props, ref) => {
    const enhancedProps = {
      ...props,

      // Enhance onChange handlers
      onChange: props.onChange
        ? (e, data) => {
            const fieldName = e.target?.name || data?.name || "unknown_field";
            const value = data?.value || e.target?.value;

            activityTracker.trackFormFieldChange(formName, fieldName, !!value);
            return props.onChange(e, data);
          }
        : undefined,

      // Enhance onSubmit handlers
      onSubmit: props.onSubmit
        ? (e) => {
            activityTracker.trackFormStart(formName);

            try {
              const result = props.onSubmit(e);

              // If it's a promise, track success/failure
              if (result && typeof result.then === "function") {
                result
                  .then(() => activityTracker.trackFormSubmit(formName, true))
                  .catch((error) => activityTracker.trackFormSubmit(formName, false, [error.message]));
              } else {
                activityTracker.trackFormSubmit(formName, true);
              }

              return result;
            } catch (error) {
              activityTracker.trackFormSubmit(formName, false, [error.message]);
              throw error;
            }
          }
        : undefined,

      // Enhance onClick for buttons
      onClick: props.onClick
        ? (e) => {
            activityTracker.log("Form элемент дээр дарагдсан", "form", {
              formName,
              elementType: e.target?.type || "unknown",
              elementName: e.target?.name || "unknown",
            });
            return props.onClick(e);
          }
        : undefined,
    };

    return <WrappedComponent {...enhancedProps} ref={ref} />;
  });

  FormTrackedComponent.displayName = `withFormTracking(${formName})`;
  return FormTrackedComponent;
}

/**
 * HOC for modal/dialog tracking
 */
export function withModalTracking(WrappedComponent, modalName) {
  const ModalTrackedComponent = React.forwardRef((props, ref) => {
    useEffect(() => {
      if (props.isOpen || props.open) {
        activityTracker.trackModalOpen(modalName);
      }
    }, [props.isOpen, props.open]);

    const enhancedProps = {
      ...props,

      onClose: props.onClose
        ? (...args) => {
            activityTracker.trackModalClose(modalName, "user_close");
            return props.onClose(...args);
          }
        : undefined,

      onCancel: props.onCancel
        ? (...args) => {
            activityTracker.trackModalClose(modalName, "user_cancel");
            return props.onCancel(...args);
          }
        : undefined,

      onConfirm: props.onConfirm
        ? (...args) => {
            activityTracker.log("Modal баталгаажуулагдсан", "modal", { modalName });
            return props.onConfirm(...args);
          }
        : undefined,
    };

    return <WrappedComponent {...enhancedProps} ref={ref} />;
  });

  ModalTrackedComponent.displayName = `withModalTracking(${modalName})`;
  return ModalTrackedComponent;
}

/**
 * HOC for search/filter components
 */
export function withSearchTracking(WrappedComponent, searchType = "general") {
  const SearchTrackedComponent = React.forwardRef((props, ref) => {
    const enhancedProps = {
      ...props,

      onSearch: props.onSearch
        ? (query, ...args) => {
            activityTracker.trackSearch(searchType, query, args[0]?.length || 0);
            return props.onSearch(query, ...args);
          }
        : undefined,

      onFilter: props.onFilter
        ? (filterType, filterValue, results) => {
            activityTracker.trackFilter(filterType, filterValue, results?.length || 0);
            return props.onFilter(filterType, filterValue, results);
          }
        : undefined,

      onSelect: props.onSelect
        ? (item, ...args) => {
            activityTracker.trackSelection(searchType, item?.id || item?.key, item?.name || item?.title || item?.label);
            return props.onSelect(item, ...args);
          }
        : undefined,
    };

    return <WrappedComponent {...enhancedProps} ref={ref} />;
  });

  SearchTrackedComponent.displayName = `withSearchTracking(${searchType})`;
  return SearchTrackedComponent;
}

/**
 * Utility function to easily wrap multiple HOCs
 */
export function composeTracking(...hocs) {
  return (Component) => {
    return hocs.reduce((acc, hoc) => hoc(acc), Component);
  };
}

/**
 * Easy-to-use decorator for class components
 */
export function trackActivity(options = {}) {
  return function (target) {
    return withActivityTracking(target, options);
  };
}

// Example usage:
// @trackActivity({ componentName: 'MyComponent', trackProps: true })
// class MyComponent extends React.Component { ... }

export default {
  withActivityTracking,
  withFormTracking,
  withModalTracking,
  withSearchTracking,
  composeTracking,
  trackActivity,
};
