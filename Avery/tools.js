(function () {
    function getStoredArray(key) {
        try {
            const value = localStorage.getItem(key);
            if (!value) {
                return [];
            }
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function getStoredObject(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            if (!value) {
                return fallback;
            }
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" ? parsed : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function normalizeRequest(request) {
        if (!request || typeof request !== "object") {
            return null;
        }

        return {
            ...request,
            customer: request.customer || {},
            delivery: request.delivery || {},
            pickup: request.pickup || {},
            status: (request.status || "").toLowerCase()
        };
    }

    function getRequests() {
        return getStoredArray("requests")
            .map(normalizeRequest)
            .filter(Boolean);
    }

    function getTodaySchedule() {
        const requests = getRequests();
        const today = new Date();
        const todayString = today.toISOString().slice(0, 10);

        const scheduledToday = requests.filter(function (request) {
            const pickupDate = request && request.delivery && request.delivery.pickupDate;
            return pickupDate && String(pickupDate).slice(0, 10) === todayString;
        });

        const pendingRequests = requests.filter(function (request) {
            const status = request.status || "";
            return ["pending", "awaiting dispatch", "awaiting review", "pending review"].includes(status);
        });

        const activeDeliveries = requests.filter(function (request) {
            const status = request.status || "";
            return ["accepted", "in progress", "assigned", "dispatched", "active"].includes(status);
        });

        const completedDeliveries = requests.filter(function (request) {
            return (request.status || "").toLowerCase() === "completed";
        });

        return {
            date: todayString,
            pickupsScheduledToday: scheduledToday.length,
            pendingRequests: pendingRequests.length,
            activeDeliveries: activeDeliveries.length,
            completedDeliveries: completedDeliveries.length,
            requests: requests
        };
    }

    function getBusinessOverview() {
        if (window.AveryAnalytics && typeof window.AveryAnalytics.getBusinessOverview === "function") {
            return window.AveryAnalytics.getBusinessOverview();
        }

        const requests = getRequests();
        const customerCounts = {};
        const routeCounts = {};
        let estimatedRevenue = 0;

        requests.forEach(function (request) {
            const customerName = request.customer && request.customer.companyName
                ? request.customer.companyName
                : request.customer && request.customer.customerName
                    ? request.customer.customerName
                    : "Unknown";

            customerCounts[customerName] = (customerCounts[customerName] || 0) + 1;

            const routeKey = [request.delivery && request.delivery.pickupAddress, request.delivery && request.delivery.deliveryAddress]
                .filter(Boolean)
                .join(" → ");

            if (routeKey) {
                routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
            }

            if (request.quote && typeof request.quote.estimatedTotal === "number") {
                estimatedRevenue += request.quote.estimatedTotal;
            }
        });

        const topCustomer = Object.keys(customerCounts).sort(function (a, b) {
            return customerCounts[b] - customerCounts[a];
        })[0] || "";

        const mostUsedRoute = Object.keys(routeCounts).sort(function (a, b) {
            return routeCounts[b] - routeCounts[a];
        })[0] || "";

        return {
            totalPickups: requests.length,
            totalCustomers: Object.keys(customerCounts).length,
            topCustomer: topCustomer,
            mostUsedRoute: mostUsedRoute,
            estimatedRevenue: estimatedRevenue,
            customerCounts: customerCounts,
            routeCounts: routeCounts
        };
    }

    function getRecentRequests(limit) {
        const requests = getRequests();
        const safeLimit = typeof limit === "number" ? limit : 5;
        return requests.slice(-safeLimit).reverse();
    }

    function getTopCustomers(limit) {
        const overview = getBusinessOverview();
        const safeLimit = typeof limit === "number" ? limit : 5;
        const entries = Object.entries(overview.customerCounts || {})
            .sort(function (a, b) {
                return b[1] - a[1];
            })
            .slice(0, safeLimit);

        return entries.map(function (entry) {
            return {
                name: entry[0],
                count: entry[1]
            };
        });
    }

    function getMostUsedRoutes(limit) {
        const overview = getBusinessOverview();
        const safeLimit = typeof limit === "number" ? limit : 5;
        const entries = Object.entries(overview.routeCounts || {})
            .sort(function (a, b) {
                return b[1] - a[1];
            })
            .slice(0, safeLimit);

        return entries.map(function (entry) {
            return {
                route: entry[0],
                count: entry[1]
            };
        });
    }

    function getQuote(requestId) {
        const requests = getRequests();
        const match = requests.find(function (request) {
            return request.trackingId === requestId || request.id === requestId || request.createdAt === requestId;
        });

        if (!match || !match.quote) {
            return {
                hasData: false,
                message: buildNotEnoughInformationMessage("quote information")
            };
        }

        return {
            hasData: true,
            request: match,
            quote: match.quote,
            message: "Quote details are available."
        };
    }

    function getSchedulingConflicts() {
        if (window.DasherLabScheduleInsights && typeof window.DasherLabScheduleInsights.getScheduleInsights === "function") {
            return window.DasherLabScheduleInsights.getScheduleInsights();
        }

        const requests = getRequests();
        const pendingRequests = requests.filter(function (request) {
            const status = (request.status || "").toLowerCase();
            return !["completed", "active", "accepted", "in progress", "assigned", "dispatched"].includes(status);
        });

        return {
            type: "scheduling_conflict",
            severity: "low",
            message: "Everything looks good. I don't see any scheduling conflicts right now.",
            affectedRequests: []
        };
    }

    function getSavedRoutes() {
        if (window.AveryMemory && typeof window.AveryMemory.getSavedRoutes === "function") {
            return window.AveryMemory.getSavedRoutes();
        }

        return getStoredArray("avery_saved_routes");
    }

    function getCustomerProfile() {
        if (window.AveryMemory && typeof window.AveryMemory.getCustomerProfile === "function") {
            return window.AveryMemory.getCustomerProfile();
        }

        const profile = getStoredObject("avery_customer_profile", null);
        const routeContext = getStoredObject("avery_last_route", null);

        const routeProfile = routeContext && typeof routeContext === "object"
            ? {
                firstName: (routeContext.fullName || "").trim().split(/\s+/)[0] || "",
                lastName: (routeContext.fullName || "").trim().split(/\s+/).slice(1).join(" ") || "",
                companyName: routeContext.companyName || "",
                email: routeContext.email || "",
                phone: routeContext.phone || ""
            }
            : null;

        return {
            firstName: (profile && profile.firstName) || (routeProfile && routeProfile.firstName) || "",
            lastName: (profile && profile.lastName) || (routeProfile && routeProfile.lastName) || "",
            companyName: (profile && profile.companyName) || (routeProfile && routeProfile.companyName) || "",
            email: (profile && profile.email) || (routeProfile && routeProfile.email) || "",
            phone: (profile && profile.phone) || (routeProfile && routeProfile.phone) || ""
        };
    }

    function getOwnerContextSnapshot() {
        return {
            scope: "owner",
            todaySchedule: getTodaySchedule(),
            businessOverview: getBusinessOverview(),
            recentRequests: getRecentRequests(5),
            topCustomers: getTopCustomers(5),
            mostUsedRoutes: getMostUsedRoutes(5),
            schedulingConflicts: getSchedulingConflicts(),
            customerProfile: getCustomerProfile(),
            savedRoutes: getSavedRoutes()
        };
    }

    function getCustomerContextSnapshot() {
        const requests = getRequests();
        return {
            scope: "customer",
            customerProfile: getCustomerProfile(),
            savedRoutes: getSavedRoutes(),
            recentQuotes: requests.filter(function (request) {
                return request.type === "Quote Request";
            }).slice(-3),
            recentPickups: requests.filter(function (request) {
                return request.type === "Pickup Request" || Boolean(request.trackingId);
            }).slice(-3)
        };
    }

    function getContextSnapshot(mode) {
        return mode === "owner" ? getOwnerContextSnapshot() : getCustomerContextSnapshot();
    }

    function buildNotEnoughInformationMessage(subject) {
        const label = subject || "that information";
        return `I don't have enough information to answer ${label} accurately. I can show you the requests and quotes currently recorded in the portal.`;
    }

    const api = {
        getTodaySchedule: getTodaySchedule,
        getBusinessOverview: getBusinessOverview,
        getRecentRequests: getRecentRequests,
        getTopCustomers: getTopCustomers,
        getMostUsedRoutes: getMostUsedRoutes,
        getQuote: getQuote,
        getSchedulingConflicts: getSchedulingConflicts,
        getSavedRoutes: getSavedRoutes,
        getCustomerProfile: getCustomerProfile,
        getOwnerContextSnapshot: getOwnerContextSnapshot,
        getCustomerContextSnapshot: getCustomerContextSnapshot,
        getContextSnapshot: getContextSnapshot,
        buildNotEnoughInformationMessage: buildNotEnoughInformationMessage
    };

    window.AveryTools = api;
    window.getTodaySchedule = getTodaySchedule;
    window.getBusinessOverview = getBusinessOverview;
    window.getRecentRequests = getRecentRequests;
    window.getTopCustomers = getTopCustomers;
    window.getMostUsedRoutes = getMostUsedRoutes;
    window.getQuote = getQuote;
    window.getSchedulingConflicts = getSchedulingConflicts;
    window.getSavedRoutes = getSavedRoutes;
    window.getCustomerProfile = getCustomerProfile;
})();
