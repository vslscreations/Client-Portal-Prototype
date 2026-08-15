// Future memory and preference persistence for Avery.
// AveryMemory is the shared storage helper for lightweight portal context.
// customerProfile stores the most recent customer identity for repeat workflows.
// savedRoutes stores frequently used pickup/delivery pairs and their usage history.
window.AveryMemory = {
    get: function (key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch (err) {
            return fallback;
        }
    },
    set: function (key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove: function (key) {
        localStorage.removeItem(key);
    },
    getCustomerProfile: function (fallback) {
        const profile = this.get("avery_customer_profile", fallback || null);
        const routeContext = this.get("avery_last_route", null);
        const routeProfile = routeContext && typeof routeContext === "object"
            ? {
                firstName: (routeContext.fullName || "").trim().split(/\s+/)[0] || "",
                lastName: (routeContext.fullName || "").trim().split(/\s+/).slice(1).join(" ") || "",
                companyName: routeContext.companyName || "",
                email: routeContext.email || "",
                phone: routeContext.phone || ""
            }
            : null;
        const resolvedProfile = {
            firstName: (profile && profile.firstName) || (routeProfile && routeProfile.firstName) || "",
            lastName: (profile && profile.lastName) || (routeProfile && routeProfile.lastName) || "",
            companyName: (profile && profile.companyName) || (routeProfile && routeProfile.companyName) || "",
            email: (profile && profile.email) || (routeProfile && routeProfile.email) || "",
            phone: (profile && profile.phone) || (routeProfile && routeProfile.phone) || ""
        };
        return resolvedProfile;
    },
    saveCustomerProfile: function (profile) {
        const existingProfile = this.getCustomerProfile({
            firstName: "",
            lastName: "",
            companyName: "",
            email: "",
            phone: ""
        });

        const nextProfile = {
            firstName: profile.firstName || existingProfile.firstName || "",
            lastName: profile.lastName || existingProfile.lastName || "",
            companyName: profile.companyName || existingProfile.companyName || "",
            email: profile.email || existingProfile.email || ""
        };

        this.set("avery_customer_profile", nextProfile);
        return nextProfile;
    },
    getDefaultRouteShape: function () {
        return {
            routeId: "",
            nickname: "",
            companyName: "",
            fullName: "",
            email: "",
            phone: "",
            pickupFacility: "",
            pickupAddress: "",
            pickupContact: "",
            pickupPhone: "",
            deliveryFacility: "",
            deliveryAddress: "",
            deliveryContact: "",
            deliveryPhone: "",
            packageType: "",
            deliveryType: "",
            lastUsed: "",
            useCount: 0
        };
    },
    normalizeSavedRoute: function (route) {
        const baseRoute = this.getDefaultRouteShape();

        if (!route || typeof route !== "object") {
            return baseRoute;
        }

        const normalizedRoute = {
            ...baseRoute,
            routeId: route.routeId || route.id || baseRoute.routeId || `route-${Date.now()}`,
            nickname: route.nickname || "",
            companyName: route.companyName || route.businessName || "",
            fullName: route.fullName || route.customerName || route.contactName || "",
            email: route.email || "",
            phone: route.phone || route.phoneNumber || "",
            pickupFacility: route.pickupFacility || "",
            pickupAddress: route.pickupAddress || "",
            pickupContact: route.pickupContact || "",
            pickupPhone: route.pickupPhone || "",
            deliveryFacility: route.deliveryFacility || "",
            deliveryAddress: route.deliveryAddress || "",
            deliveryContact: route.deliveryContact || "",
            deliveryPhone: route.deliveryPhone || "",
            packageType: route.packageType || "",
            deliveryType: route.deliveryType || "",
            lastUsed: route.lastUsed || "",
            useCount: typeof route.useCount === "number" ? route.useCount : 0
        };

        Object.keys(route).forEach(function (key) {
            if (!(key in normalizedRoute)) {
                normalizedRoute[key] = route[key];
            }
        });

        return normalizedRoute;
    },
    getSavedRoutes: function () {
        const routes = this.get("avery_saved_routes", []);
        if (!Array.isArray(routes)) {
            return [];
        }

        const normalizedRoutes = routes.map(function (route) {
            return this.normalizeSavedRoute(route);
        }, this);

        this.set("avery_saved_routes", normalizedRoutes);
        return normalizedRoutes;
    },
    savePickupRoute: function (formValues, routeId) {
        const routes = this.getSavedRoutes();
        const values = formValues || {};
        const pickupAddress = (values.pickupAddress || values.pickup || "").trim();
        const deliveryAddress = (values.deliveryAddress || values.delivery || "").trim();
        const deliveryType = (values.deliveryType || values.serviceLevel || "").trim();
        const normalizedPickup = pickupAddress.toLowerCase();
        const normalizedDelivery = deliveryAddress.toLowerCase();

        const existingIndex = routes.findIndex(function (route) {
            return (route.pickupAddress || "").toLowerCase() === normalizedPickup &&
                (route.deliveryAddress || "").toLowerCase() === normalizedDelivery;
        });

        const existingRoute = existingIndex >= 0 ? routes[existingIndex] : null;
        const now = new Date().toISOString();

        const savedRoute = this.normalizeSavedRoute({
            ...(existingRoute || {}),
            routeId: routeId || values.routeId || existingRoute && existingRoute.routeId || `route-${Date.now()}`,
            nickname: values.nickname || (existingRoute && existingRoute.nickname) || "",
            companyName: (values.companyName || values.businessName || (existingRoute && existingRoute.companyName) || (existingRoute && existingRoute.businessName) || "").trim(),
            fullName: (values.fullName || values.customerName || values.contactName || (existingRoute && existingRoute.fullName) || "").trim(),
            email: (values.email || (existingRoute && existingRoute.email) || "").trim(),
            phone: (values.phone || values.phoneNumber || (existingRoute && existingRoute.phone) || "").trim(),
            pickupFacility: values.pickupFacility || (existingRoute && existingRoute.pickupFacility) || "",
            pickupAddress: pickupAddress || (existingRoute && existingRoute.pickupAddress) || "",
            pickupContact: values.pickupContact || (existingRoute && existingRoute.pickupContact) || "",
            pickupPhone: values.pickupPhone || (existingRoute && existingRoute.pickupPhone) || "",
            deliveryFacility: values.deliveryFacility || (existingRoute && existingRoute.deliveryFacility) || "",
            deliveryAddress: deliveryAddress || (existingRoute && existingRoute.deliveryAddress) || "",
            deliveryContact: values.deliveryContact || (existingRoute && existingRoute.deliveryContact) || "",
            deliveryPhone: values.deliveryPhone || (existingRoute && existingRoute.deliveryPhone) || "",
            packageType: values.packageType || (existingRoute && existingRoute.packageType) || "",
            deliveryType: deliveryType || (existingRoute && existingRoute.deliveryType) || "",
            lastUsed: now,
            useCount: existingRoute ? (existingRoute.useCount || 0) + 1 : 1
        });

        if (existingRoute) {
            routes[existingIndex] = savedRoute;
        } else {
            routes.push(savedRoute);
        }

        this.set("avery_saved_routes", routes);
        if (window && window.__averyDebugLog) {
            window.__averyDebugLog.push({ stage: "STAGE 1", value: this.getSavedRoutes() });
        }
        console.log("STAGE 1", this.getSavedRoutes());
        return savedRoute;
    },
    installPipelineDebugHooks: function () {
        if (window.__averyPipelineDebugHooksInstalled) {
            return;
        }

        window.__averyPipelineDebugHooksInstalled = true;
        window.__averyDebugLog = window.__averyDebugLog || [];

        const debugFieldNames = [
            "companyName",
            "fullName",
            "email",
            "phone",
            "pickupFacility",
            "pickupAddress",
            "pickupContact",
            "pickupPhone",
            "deliveryFacility",
            "deliveryAddress",
            "deliveryContact",
            "deliveryPhone",
            "packageType",
            "deliveryType"
        ];

        const fieldIdMap = {
            companyName: "businessName",
            fullName: "fullName",
            email: "email",
            phone: "phone",
            pickupFacility: "pickupFacility",
            pickupAddress: "pickupAddress",
            pickupContact: "pickupContact",
            pickupPhone: "pickupPhone",
            deliveryFacility: "deliveryFacility",
            deliveryAddress: "deliveryAddress",
            deliveryContact: "deliveryContact",
            deliveryPhone: "deliveryPhone",
            packageType: "packageType",
            deliveryType: "deliveryType"
        };

        const originalSet = this.set;
        this.set = function (key, value) {
            const result = originalSet.call(this, key, value);
            if (key === "currentTask" && value && value.fields) {
                const routeContext = this.get("avery_last_route", null);
                const fields = value.fields || {};
                if (routeContext) {
                    if (!fields.companyName && routeContext.companyName) {
                        fields.companyName = routeContext.companyName;
                    }
                    if (!fields.fullName && routeContext.fullName) {
                        fields.fullName = routeContext.fullName;
                    }
                    if (!fields.email && routeContext.email) {
                        fields.email = routeContext.email;
                    }
                    if (!fields.phone && routeContext.phone) {
                        fields.phone = routeContext.phone;
                    }
                    if (!fields.pickupFacility && routeContext.pickupFacility) {
                        fields.pickupFacility = routeContext.pickupFacility;
                    }
                    if (!fields.pickupAddress && routeContext.pickupAddress) {
                        fields.pickupAddress = routeContext.pickupAddress;
                    }
                    if (!fields.pickupContact && routeContext.pickupContact) {
                        fields.pickupContact = routeContext.pickupContact;
                    }
                    if (!fields.pickupPhone && routeContext.pickupPhone) {
                        fields.pickupPhone = routeContext.pickupPhone;
                    }
                    if (!fields.deliveryFacility && routeContext.deliveryFacility) {
                        fields.deliveryFacility = routeContext.deliveryFacility;
                    }
                    if (!fields.deliveryAddress && routeContext.deliveryAddress) {
                        fields.deliveryAddress = routeContext.deliveryAddress;
                    }
                    if (!fields.deliveryContact && routeContext.deliveryContact) {
                        fields.deliveryContact = routeContext.deliveryContact;
                    }
                    if (!fields.deliveryPhone && routeContext.deliveryPhone) {
                        fields.deliveryPhone = routeContext.deliveryPhone;
                    }
                    if (!fields.packageType && routeContext.packageType) {
                        fields.packageType = routeContext.packageType;
                    }
                    if (!fields.deliveryType && routeContext.deliveryType) {
                        fields.deliveryType = routeContext.deliveryType;
                    }
                }
                value.fields = fields;
                if (window && window.__averyDebugLog) {
                    window.__averyDebugLog.push({ stage: "STAGE 3 TASK", value: value.fields });
                }
                console.log("STAGE 3 TASK", value.fields);
            }
            return result;
        };

        const installPopulateFormDebug = function () {
            const debugPopulate = function (populateFn) {
                if (!populateFn || populateFn.__averyDebugWrapped) {
                    return populateFn;
                }

                populateFn.__averyDebugWrapped = true;
                return function (task) {
                    const currentTask = task || window.AveryMemory.get("currentTask", null);
                    const fields = currentTask && currentTask.fields ? currentTask.fields : {};
                    if (window && window.__averyDebugLog) {
                        window.__averyDebugLog.push({ stage: "STAGE 4 HTML", value: fields });
                    }
                    console.log("STAGE 4 HTML", fields);
                    const result = populateFn.call(this, task);
                    const domValues = {};
                    debugFieldNames.forEach(function (fieldName) {
                        const elementId = fieldIdMap[fieldName];
                        const element = elementId ? document.getElementById(elementId) : null;
                        if (element) {
                            domValues[elementId] = element.value;
                            console.log(elementId, element.value);
                        }
                    });
                    if (window && window.__averyDebugLog) {
                        window.__averyDebugLog.push({ stage: "STAGE 4 DOM", value: domValues });
                    }
                    return result;
                };
            };

            if (window.AveryActions && window.AveryActions.populatePickupForm) {
                window.AveryActions.populatePickupForm = debugPopulate(window.AveryActions.populatePickupForm);
            }
            if (window.populatePickupForm) {
                window.populatePickupForm = debugPopulate(window.populatePickupForm);
            }
        };

        const installWorkflowDebug = function () {
            if (!window.AveryWorkflowEngine || typeof window.AveryWorkflowEngine.applyRouteToPickup !== "function") {
                return;
            }

            const originalApply = window.AveryWorkflowEngine.applyRouteToPickup;
            window.AveryWorkflowEngine.applyRouteToPickup = function (route) {
                if (window && window.__averyDebugLog) {
                    window.__averyDebugLog.push({ stage: "STAGE 2 ROUTE", value: route });
                }
                console.log("STAGE 2 ROUTE", route);
                if (route) {
                    window.AveryMemory.set("avery_last_route", route);
                }
                return originalApply.call(this, route);
            };
        };

        const installHooks = function () {
            installWorkflowDebug();
            installPopulateFormDebug();
        };

        if (document.readyState === "complete") {
            installHooks();
        } else {
            window.addEventListener("load", installHooks);
        }
    }
};

window.AveryMemory.installPipelineDebugHooks();
